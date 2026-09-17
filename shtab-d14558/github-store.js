/*
 * Клиент для хранения данных трекера в приватном GitHub-репозитории
 * через Contents API. Все секреты (токен) берутся из настроек (localStorage)
 * и никогда никуда, кроме api.github.com, не отправляются.
 */
(function (global) {
  'use strict';

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    const binary = atob(b64.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  class GitHubStore {
    constructor({ token, owner, repo, branch }) {
      this.token = token;
      this.owner = owner;
      this.repo = repo;
      this.branch = branch || 'main';
    }

    get ready() {
      return !!(this.token && this.owner && this.repo);
    }

    apiUrl(path) {
      const cleanPath = String(path).replace(/^\/+/, '');
      return `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${cleanPath}`;
    }

    async _request(url, options = {}) {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `token ${this.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(options.headers || {}),
        },
      });
      return res;
    }

    /** Возвращает {json, sha} или null, если файла ещё нет. */
    async getJson(path) {
      const url = `${this.apiUrl(path)}?ref=${encodeURIComponent(this.branch)}&_=${Date.now()}`;
      const res = await this._request(url);
      if (res.status === 404) return null;
      if (!res.ok) throw await this._err('Не удалось прочитать ' + path, res);
      const data = await res.json();
      const text = base64ToUtf8(data.content);
      return { json: JSON.parse(text), sha: data.sha };
    }

    /** Создаёт или обновляет JSON-файл. Возвращает новый sha. */
    async putJson(path, obj, message, sha) {
      const body = {
        message,
        content: utf8ToBase64(JSON.stringify(obj, null, 2) + '\n'),
        branch: this.branch,
      };
      if (sha) body.sha = sha;
      const res = await this._request(this.apiUrl(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await this._err('Не удалось сохранить ' + path, res);
      const data = await res.json();
      return data.content.sha;
    }

    /** Создаёт или обновляет текстовый файл (например, готовую HTML-страницу). Возвращает новый sha. */
    async putText(path, text, message, sha) {
      let currentSha = sha;
      if (currentSha === undefined) {
        const existing = await this._request(`${this.apiUrl(path)}?ref=${encodeURIComponent(this.branch)}`);
        if (existing.status === 200) {
          const data = await existing.json();
          currentSha = data.sha;
        }
      }
      const body = { message, content: utf8ToBase64(text), branch: this.branch };
      if (currentSha) body.sha = currentSha;
      const res = await this._request(this.apiUrl(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await this._err('Не удалось сохранить ' + path, res);
      const data = await res.json();
      return data.content.sha;
    }

    /** Читает JSON, если нет — создаёт со значением по умолчанию. */
    async ensureJson(path, defaultObj, message) {
      const existing = await this.getJson(path);
      if (existing) return existing;
      const sha = await this.putJson(path, defaultObj, message || `Инициализация ${path}`);
      return { json: defaultObj, sha };
    }

    /** Возвращает содержимое файла как base64-строку (без декодирования), либо null. */
    async getRawBase64(path) {
      const url = `${this.apiUrl(path)}?ref=${encodeURIComponent(this.branch)}&_=${Date.now()}`;
      const res = await this._request(url);
      if (res.status === 404) return null;
      if (!res.ok) throw await this._err('Не удалось прочитать ' + path, res);
      const data = await res.json();
      return data.content.replace(/\n/g, '');
    }

    /**
     * Загружает бинарный файл (картинку) по base64-содержимому (без префикса data:).
     * Возвращает { path, sha, rawUrl }.
     */
    async putBinary(path, base64Content, message) {
      let sha;
      const existing = await this._request(`${this.apiUrl(path)}?ref=${encodeURIComponent(this.branch)}`);
      if (existing.status === 200) {
        const data = await existing.json();
        sha = data.sha;
      }
      const body = { message, content: base64Content, branch: this.branch };
      if (sha) body.sha = sha;
      const res = await this._request(this.apiUrl(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await this._err('Не удалось загрузить файл ' + path, res);
      const data = await res.json();
      return {
        path,
        sha: data.content.sha,
        rawUrl: `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${path}`,
      };
    }

    async _err(prefix, res) {
      let detail = '';
      try {
        const j = await res.json();
        detail = j.message || '';
      } catch (e) { /* ignore */ }
      return new Error(`${prefix} (HTTP ${res.status}). ${detail}`);
    }

    /** Быстрая проверка токена/доступа. */
    async testConnection() {
      const res = await this._request(`https://api.github.com/repos/${this.owner}/${this.repo}`);
      if (!res.ok) throw await this._err('Репозиторий данных недоступен', res);
      return res.json();
    }
  }

  /**
   * Обновляет JSON-файл с повторной попыткой при конфликте sha (409):
   * перечитывает файл и применяет updater(currentJson) заново.
   */
  async function updateJsonWithRetry(store, path, updater, message, retries = 2) {
    let attempt = 0;
    for (;;) {
      const current = await store.ensureJson(path, updater(null) ?? [], message);
      const nextJson = updater(current.json);
      try {
        const sha = await store.putJson(path, nextJson, message, current.sha);
        return { json: nextJson, sha };
      } catch (e) {
        if (attempt >= retries) throw e;
        attempt += 1;
      }
    }
  }

  global.GitHubStore = GitHubStore;
  global.ghUtil = { utf8ToBase64, base64ToUtf8, updateJsonWithRetry };
})(window);
