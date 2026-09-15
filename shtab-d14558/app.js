(function () {
  'use strict';

  /* ===================== Конфигурация площадок ===================== */
  const PLATFORM_DEFS = {
    tg_morning: { label: 'Telegram · утро', group: 'tg', code: 'TG', cadence: 'daily', startKey: 'tgStart', total: 74 },
    tg_evening: { label: 'Telegram · вечер', group: 'tg', code: 'TG', cadence: 'daily', startKey: 'tgStart', total: null },
    vk: { label: 'ВКонтакте', group: 'vk', code: 'ВК', cadence: 'daily', startKey: 'vkStart', total: 26 },
    vc: { label: 'vc.ru', group: 'vc', code: 'VC', cadence: 'weekday', weekdays: [2, 5], startKey: 'vcStart', total: 19 },
  };
  const SITE_DEF = { label: 'Сайт zhivoy-ai.ru', total: 44, transferEveryDays: 3 };
  const STATUS_LABEL = { none: 'нет поста', draft: 'черновик', edited: 'отредактировано', published: 'опубликовано' };
  const TAGS = ['промпты', 'реальные-истории', 'лайфхаки', 'разбор'];
  const CTA_HTML = '<p align="center"><a href="https://t.me/zhivoy_ii" target="_blank" style="background-color: #0088cc; color: #ffffff; padding: 10px 20px; border-radius: 15px; text-decoration: none; display: inline-block;">Перейти в Telegram «ЖИВОЙ ИИ»</a></p>';

  const LS_SETTINGS = 'zi_ctrl_settings_v1';
  const LS_PWHASH = 'zi_ctrl_pwhash_v1';

  const DEFAULT_SETTINGS = {
    ghToken: '', dataOwner: 'zhivoy-blog', dataRepo: 'zi-control-data', dataBranch: 'main',
    siteOwner: 'zhivoy-blog', siteRepo: 'zhivoy-blog.github.io', siteBranch: 'main',
    gasUrl: '', gasToken: '', tgChatId: '', vkGroupId: '',
    tgStart: '2026-06-28', vkStart: '2026-08-21', vcStart: '2026-06-29',
  };

  const state = {
    settings: loadSettings(),
    posts: [],
    counters: { tg: {}, vk: {}, vc: {} },
    currentEditorId: null,
    currentEditorIsNew: false,
    loaded: false,
  };

  /* ===================== Утилиты ===================== */
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function nowIso() { return new Date().toISOString(); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function formatDateRu(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const s = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function formatDateTimeRu(iso) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }
  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function toast(message, type) {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
  function extOf(filename) {
    const m = /\.([a-zA-Z0-9]+)$/.exec(filename || '');
    return m ? m[1].toLowerCase() : 'jpg';
  }
  function mimeFromExt(ext) {
    return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/jpeg';
  }
  function transliterate(str) {
    const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
    return String(str).toLowerCase().split('').map((ch) => (map[ch] !== undefined ? map[ch] : ch)).join('');
  }
  function slugify(str) {
    return transliterate(str).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post-' + Date.now();
  }
  // Письма с постами иногда содержат служебную заметку в конце (источник, обоснование
  // промта и т.п.), отделённую строкой из дефисов или явной пометкой — это не для публикации
  // ни в одну площадку, поэтому отрезаем всё после такой строки.
  // \p{Pd} — юникод-категория «тире» (включает -, –, —, ― и т.п.), чтобы ловить
  // любой символ-разделитель, каким бы его ни написали в письме.
  const DIVIDER_RE = /^[\p{Pd}_=~]{3,}$/u;
  function stripInternalNote(text) {
    const lines = String(text || '').split('\n');
    let cutIndex = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (DIVIDER_RE.test(line) || /^служебная заметка/i.test(line)) { cutIndex = i; break; }
    }
    return lines.slice(0, cutIndex).join('\n').trim();
  }
  // Хэштеги и строки-разделители нужны в Telegram/ВК, но не на сайте — убираем их
  // с конца текста (в любом порядке, могут чередоваться).
  function stripTrailingDecoration(text) {
    const lines = String(text || '').split('\n');
    const isHashtagLine = (l) => /^(#\S+\s*)+$/.test(l);
    while (lines.length) {
      const last = lines[lines.length - 1].trim();
      if (isHashtagLine(last) || DIVIDER_RE.test(last)) { lines.pop(); continue; }
      break;
    }
    return lines.join('\n').trim();
  }
  // Эмодзи уместны в Telegram/ВК, но не на сайте — убираем их из версии для сайта целиком,
  // включая варианты с модификаторами тона кожи и ZWJ-последовательности.
  function stripEmojis(text) {
    return String(text || '')
      .replace(/(\p{Extended_Pictographic}|\p{Emoji_Modifier}|️|‍)+/gu, '')
      .split('\n').map((l) => l.replace(/[ \t]{2,}/g, ' ').trim()).join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }
  // Строки полностью в кавычках (обычно готовый промт) оформляем как цитату,
  // остальной текст группируем в абзацы по пустым строкам.
  function textToArticleHtml(text) {
    const lines = String(text || '').split('\n');
    let html = '';
    let buffer = [];
    const flush = () => {
      if (buffer.length) {
        html += `<p>${buffer.map(escapeHtml).join('<br>')}</p>`;
        buffer = [];
      }
    };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { flush(); return; }
      if (/^[«"“].+[»"”]$/.test(line) && line.length > 15) {
        flush();
        const inner = line.replace(/^[«"“]/, '').replace(/[»"”]$/, '');
        html += `<blockquote style="margin:16px 0;padding:10px 16px;border-left:3px solid #007aff;background:rgba(0,122,255,0.08);border-radius:8px;font-style:italic;">${escapeHtml(inner)}</blockquote>`;
      } else {
        buffer.push(line);
      }
    });
    flush();
    return html;
  }
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ===================== Настройки ===================== */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch (e) { return { ...DEFAULT_SETTINGS }; }
  }
  function saveSettings(s) {
    state.settings = s;
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  }
  function settingsReady() {
    return !!(state.settings.ghToken && state.settings.dataOwner && state.settings.dataRepo);
  }
  function dataStore() {
    return new GitHubStore({ token: state.settings.ghToken, owner: state.settings.dataOwner, repo: state.settings.dataRepo, branch: state.settings.dataBranch });
  }
  function siteStore() {
    return new GitHubStore({ token: state.settings.ghToken, owner: state.settings.siteOwner, repo: state.settings.siteRepo, branch: state.settings.siteBranch });
  }

  /* ===================== Пароль / гейт ===================== */
  function gateInit() {
    const hasPw = !!localStorage.getItem(LS_PWHASH);
    $('#gate-password2-wrap').hidden = hasPw;
    $('#gate-title').textContent = hasPw ? 'Живой ИИ: Контроль' : 'Придумайте пароль';
    $('#gate-text').textContent = hasPw
      ? 'Личный трекер контент-проекта.'
      : 'Первый запуск на этом устройстве. Пароль хранится только локально, в самом приложении его нигде нет.';
    $('#gate-submit').textContent = hasPw ? 'Войти' : 'Создать и войти';
  }

  async function gateSubmit() {
    const hasPw = !!localStorage.getItem(LS_PWHASH);
    const pw = $('#gate-password').value;
    const errBox = $('#gate-error');
    errBox.hidden = true;
    if (!pw) { errBox.textContent = 'Введите пароль.'; errBox.hidden = false; return; }
    if (hasPw) {
      const hash = await sha256Hex(pw);
      if (hash !== localStorage.getItem(LS_PWHASH)) {
        errBox.textContent = 'Неверный пароль.'; errBox.hidden = false; return;
      }
      unlockApp();
    } else {
      const pw2 = $('#gate-password2').value;
      if (pw.length < 4) { errBox.textContent = 'Пароль слишком короткий (минимум 4 символа).'; errBox.hidden = false; return; }
      if (pw !== pw2) { errBox.textContent = 'Пароли не совпадают.'; errBox.hidden = false; return; }
      localStorage.setItem(LS_PWHASH, await sha256Hex(pw));
      unlockApp();
    }
  }

  function unlockApp() {
    $('#gate').hidden = true;
    $('#app').hidden = false;
    $('#tab-bar').hidden = false;
    $('#gate-password').value = '';
    $('#gate-password2').value = '';
    initApp();
  }
  function lockApp() {
    $('#gate').hidden = false;
    $('#app').hidden = true;
    $('#tab-bar').hidden = true;
    gateInit();
  }
  function resetDevice() {
    if (!confirm('Удалить пароль и все локальные настройки на этом устройстве? Данные в GitHub-репозитории не пострадают.')) return;
    localStorage.removeItem(LS_PWHASH);
    localStorage.removeItem(LS_SETTINGS);
    location.reload();
  }

  /* ===================== Расписание ===================== */
  function duePlatformsFor(dateStr) {
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    return Object.keys(PLATFORM_DEFS).filter((key) => {
      const def = PLATFORM_DEFS[key];
      const start = state.settings[def.startKey];
      if (!start || dateStr < start) return false;
      if (def.cadence === 'weekday') return def.weekdays.includes(dow);
      return true;
    });
  }
  function projectDayNumber(dateStr) {
    const starts = Object.values(PLATFORM_DEFS).map((d) => state.settings[d.startKey]).filter(Boolean).sort();
    if (!starts.length) return null;
    return daysBetween(starts[0], dateStr) + 1;
  }
  function findPostFor(platform, dateStr) {
    return state.posts.find((p) => p.platform === platform && p.scheduledDate === dateStr) || null;
  }

  /* ===================== Проверка дублей ===================== */
  // Служебные слова письма/шаблона ("Утренний пост Telegram на 15.09.2026") встречаются
  // в теме каждого письма и не должны влиять на сравнение — поэтому дубли ищем по
  // содержимому поста (contentForDupCheck), а не по строке темы письма.
  const STOPWORDS = new Set(['что', 'это', 'для', 'как', 'но', 'или', 'если', 'так', 'тоже', 'еще', 'ещё', 'очень', 'все', 'всех', 'всем', 'всего', 'его', 'ее', 'её', 'их', 'они', 'она', 'он', 'вы', 'мы', 'ты', 'был', 'была', 'были', 'будет', 'чтобы', 'при', 'после', 'из', 'от', 'до', 'под', 'над', 'про', 'через', 'между', 'только', 'уже', 'где', 'когда', 'почему', 'который', 'которая', 'которое', 'которые', 'этот', 'эта', 'эти', 'тот', 'та', 'те', 'пост', 'telegram', 'вконтакте', 'утренний', 'вечерний', 'утро', 'вечер', 'на']);

  function contentForDupCheck(post) {
    const body = String(post.bodyText || '').trim();
    return body.length >= 20 ? body : String(post.topic || '');
  }
  function textWords(text) {
    const norm = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
    return new Set(norm.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w)));
  }
  function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    a.forEach((w) => { if (b.has(w)) inter += 1; });
    return inter / (a.size + b.size - inter);
  }
  function findPossibleDuplicate(post, allPosts) {
    const words = textWords(contentForDupCheck(post));
    if (words.size < 5) return null; // слишком мало текста для надёжного сравнения
    let best = null;
    for (const other of allPosts) {
      if (other.id === post.id) continue;
      if (Math.abs(daysBetween(other.scheduledDate, post.scheduledDate)) > 30) continue;
      const otherWords = textWords(contentForDupCheck(other));
      if (otherWords.size < 5) continue;
      const sim = jaccard(words, otherWords);
      if (sim >= 0.5 && (!best || sim > best.sim)) best = { post: other, sim };
    }
    return best;
  }
  function annotateDuplicates() {
    state.posts.forEach((p) => {
      const dup = findPossibleDuplicate(p, state.posts);
      p.possibleDuplicateOf = dup ? dup.post.id : null;
    });
  }

  /* ===================== Данные (GitHub) ===================== */
  async function loadAll() {
    renderAll(); // сразу показать расписание на сегодня, даже без данных из GitHub
    if (!settingsReady()) {
      $('#header-sub').textContent = 'Настройте подключение к данным ⚙️';
      return;
    }
    $('#header-sub').textContent = 'Загрузка…';
    try {
      const store = dataStore();
      const [postsRes, countersRes] = await Promise.all([
        store.ensureJson('posts.json', [], 'Инициализация posts.json'),
        store.ensureJson('counters.json', { tg: {}, vk: {}, vc: { manual: true } }, 'Инициализация counters.json'),
      ]);
      state.posts = postsRes.json;
      state.counters = countersRes.json;
      annotateDuplicates();
      state.loaded = true;
      $('#header-sub').textContent = 'Синхронизировано ' + new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date());
      renderAll();
    } catch (e) {
      console.error(e);
      $('#header-sub').textContent = 'Ошибка загрузки данных';
      toast('Не удалось загрузить данные: ' + e.message, 'error');
    }
  }

  async function persistPosts(mutator, message) {
    const store = dataStore();
    const result = await ghUtil.updateJsonWithRetry(store, 'posts.json', (current) => mutator(current || []), message);
    state.posts = result.json;
    annotateDuplicates();
    return result;
  }
  async function persistCounters(mutator, message) {
    const store = dataStore();
    const result = await ghUtil.updateJsonWithRetry(store, 'counters.json', (current) => mutator(current || { tg: {}, vk: {}, vc: { manual: true } }), message);
    state.counters = result.json;
    return result;
  }

  /* ===================== Синхронизация с почтой (Apps Script) ===================== */
  async function callGas(action, payload) {
    if (!state.settings.gasUrl || !state.settings.gasToken) throw new Error('Не настроен Apps Script (см. Настройки).');
    const res = await fetch(state.settings.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: state.settings.gasToken, ...payload }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Ошибка Apps Script');
    return data;
  }

  function guessPlatformFromSubject(subject) {
    const s = (subject || '').toLowerCase();
    if (/утр/.test(s) && /(tg|телеграм|телеграмм)/.test(s)) return 'tg_morning';
    if (/(вечер)/.test(s) && /(tg|телеграм|телеграмм)/.test(s)) return 'tg_evening';
    if (/вк|vk|вконтакте/.test(s)) return 'vk';
    if (/vc\.ru|vc ru|вц\.ру/.test(s)) return 'vc';
    if (/утр/.test(s)) return 'tg_morning';
    if (/вечер/.test(s)) return 'tg_evening';
    return null;
  }

  async function syncGmail() {
    const statusBox = $('#today-sync-status');
    statusBox.innerHTML = '<span class="spinner"></span> Забираю письма…';
    try {
      const res = await callGas('fetchPosts', {});
      const fetched = res.posts || [];
      const existingIds = new Set(state.posts.map((p) => p.sourceMessageId).filter(Boolean));
      const toAdd = [];
      for (const item of fetched) {
        if (existingIds.has(item.sourceMessageId)) continue;
        const platform = item.guessedPlatform || guessPlatformFromSubject(item.subjectRaw);
        if (!platform || !PLATFORM_DEFS[platform]) continue;
        const dateStr = (item.receivedAt || nowIso()).slice(0, 10);
        const postId = 'p_' + item.sourceMessageId;
        const images = [];
        for (const img of (item.images || [])) {
          try {
            const path = `images/${postId}/${Date.now()}_${img.filename}`;
            const up = await dataStore().putBinary(path, img.base64, `Картинка для ${postId}`);
            images.push({ name: img.filename, path: up.path, url: up.rawUrl, role: 'inline' });
          } catch (e) { console.error('image upload failed', e); }
        }
        toAdd.push({
          id: postId, platform, scheduledDate: dateStr, topic: (item.topic || item.subjectRaw || '').slice(0, 160),
          bodyText: item.bodyText || '', images, status: 'draft', source: 'gmail', sourceMessageId: item.sourceMessageId,
          createdAt: nowIso(), updatedAt: nowIso(), siteTransfer: { status: 'none' },
        });
      }
      if (toAdd.length) {
        await persistPosts((current) => [...current, ...toAdd], `Синхронизация: +${toAdd.length} постов из почты`);
        try { await callGas('markProcessed', { messageIds: toAdd.map((p) => p.sourceMessageId) }); } catch (e) { console.warn(e); }
      }
      statusBox.innerHTML = '';
      toast(toAdd.length ? `Добавлено новых постов: ${toAdd.length}` : 'Новых писем нет', 'success');
      renderAll();
    } catch (e) {
      console.error(e);
      statusBox.innerHTML = '';
      toast('Не удалось синхронизировать почту: ' + e.message, 'error');
    }
  }

  async function refreshStats() {
    try {
      const res = await callGas('getStats', {});
      await persistCounters((c) => ({
        ...c,
        tg: { ...c.tg, subscribers: res.telegram ? res.telegram.subscribers : c.tg.subscribers, updatedAt: nowIso() },
        vk: { ...c.vk, subscribers: res.vk ? res.vk.subscribers : c.vk.subscribers, updatedAt: nowIso() },
      }), 'Обновление счётчиков TG/ВК');
      toast('Счётчики обновлены', 'success');
      renderCounters();
    } catch (e) {
      toast('Не удалось обновить счётчики: ' + e.message, 'error');
    }
  }

  async function saveVcCounter() {
    const val = parseInt($('#vc-input').value, 10);
    if (Number.isNaN(val) || val < 0) { toast('Введите число подписчиков', 'error'); return; }
    try {
      await persistCounters((c) => ({ ...c, vc: { manual: true, subscribers: val, updatedAt: nowIso() } }), 'Обновление счётчика vc.ru вручную');
      toast('Сохранено', 'success');
      renderCounters();
    } catch (e) { toast('Ошибка сохранения: ' + e.message, 'error'); }
  }

  /* ===================== Рендер: Сегодня ===================== */
  function renderToday() {
    const today = todayStr();
    $('#today-date').textContent = formatDateRu(today);
    const dayN = projectDayNumber(today);
    $('#today-day-n').innerHTML = dayN !== null ? `День ${dayN}` : '—';

    const due = duePlatformsFor(today);
    const list = $('#today-list');
    list.innerHTML = '';
    if (!due.length) {
      list.innerHTML = '<div class="empty-state">На сегодня по графику ничего не запланировано.</div>';
    }
    due.forEach((key) => {
      const def = PLATFORM_DEFS[key];
      const post = findPostFor(key, today);
      const row = document.createElement('div');
      row.className = 'post-row';
      const status = post ? post.status : 'none';
      row.innerHTML = `
        <div class="plat-icon ${def.group}">${def.code}</div>
        <div class="info">
          <div class="plat-name">${def.label}</div>
          <div class="topic">${post && post.topic ? escapeHtml(post.topic) : (post ? 'Без темы' : 'Ещё не пришло письмо — нажмите «Обновить»')}</div>
          ${post && post.possibleDuplicateOf ? '<div class="dup-flag">⚠ Похоже на повтор темы</div>' : ''}
        </div>
        <span class="badge ${status}">${STATUS_LABEL[status]}</span>
      `;
      row.addEventListener('click', () => openEditor(key, post));
      list.appendChild(row);
    });

    renderSiteTransferBlock();
  }

  function renderSiteTransferBlock() {
    const title = $('#site-transfer-title');
    const block = $('#site-transfer-block');
    block.innerHTML = '';
    const transferred = state.posts.filter((p) => p.siteTransfer && p.siteTransfer.status === 'published' && p.siteTransfer.publishedAt);
    const lastDate = transferred.length
      ? transferred.map((p) => p.siteTransfer.publishedAt.slice(0, 10)).sort().pop()
      : (Object.values(PLATFORM_DEFS).map((d) => state.settings[d.startKey]).filter(Boolean).sort()[0] || todayStr());
    const dueInDays = SITE_DEF.transferEveryDays - daysBetween(lastDate, todayStr());
    const candidate = state.posts
      .filter((p) => p.status === 'published' && (!p.siteTransfer || p.siteTransfer.status !== 'published'))
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];

    if (dueInDays > 0 || !candidate) {
      title.hidden = true;
      return;
    }
    title.hidden = false;
    const row = document.createElement('div');
    row.className = 'post-row';
    row.innerHTML = `
      <div class="plat-icon site">Ж</div>
      <div class="info">
        <div class="plat-name">Пора перенести пост на сайт</div>
        <div class="topic">${escapeHtml(candidate.topic || 'Без темы')} · ${PLATFORM_DEFS[candidate.platform].label}</div>
      </div>
      <span class="badge draft">подготовить</span>
    `;
    row.addEventListener('click', () => openEditor(candidate.platform, candidate));
    block.appendChild(row);
  }

  /* ===================== Рендер: Счётчики ===================== */
  function countPublished(group) {
    return state.posts.filter((p) => PLATFORM_DEFS[p.platform] && PLATFORM_DEFS[p.platform].group === group && p.status === 'published').length;
  }
  function renderCounters() {
    const grid = $('#counter-grid');
    const sitePosts = state.posts.filter((p) => p.siteTransfer && p.siteTransfer.status === 'published').length;
    const cards = [
      { key: 'tg', label: 'Telegram', subs: state.counters.tg && state.counters.tg.subscribers, updatedAt: state.counters.tg && state.counters.tg.updatedAt, count: countPublished('tg'), total: 74 },
      { key: 'vk', label: 'ВКонтакте', subs: state.counters.vk && state.counters.vk.subscribers, updatedAt: state.counters.vk && state.counters.vk.updatedAt, count: countPublished('vk'), total: 26 },
      { key: 'vc', label: 'vc.ru', subs: state.counters.vc && state.counters.vc.subscribers, updatedAt: state.counters.vc && state.counters.vc.updatedAt, count: countPublished('vc'), total: 19 },
      { key: 'site', label: 'Сайт zhivoy-ai.ru', subs: null, count: sitePosts, total: SITE_DEF.total },
    ];
    grid.innerHTML = cards.map((c) => `
      <div class="counter-card">
        <div class="plat">${c.label}</div>
        <div class="num">${c.subs != null ? c.subs.toLocaleString('ru-RU') : c.count}</div>
        <div class="sub">${c.subs != null ? `подписчиков${c.updatedAt ? ' · ' + formatDateTimeRu(c.updatedAt) : ''}` : `постов из ~${c.total}`}</div>
        ${c.subs != null ? `<div class="sub" style="margin-top:2px">постов: ${c.count} / ~${c.total}</div>` : ''}
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, Math.round((c.count / c.total) * 100))}%"></div></div>
      </div>
    `).join('');

    $('#vc-input').value = (state.counters.vc && state.counters.vc.subscribers) || '';
    $('#vc-updated').textContent = state.counters.vc && state.counters.vc.updatedAt ? 'Обновлено ' + formatDateTimeRu(state.counters.vc.updatedAt) : 'Ещё не вводилось';
  }

  /* ===================== Рендер: История ===================== */
  function renderHistory() {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    const events = [];
    state.posts.forEach((p) => {
      if (p.status === 'published' && p.publishedAt && new Date(p.publishedAt) >= cutoff) {
        events.push({ date: p.publishedAt.slice(0, 10), time: p.publishedAt, label: PLATFORM_DEFS[p.platform].label, topic: p.topic });
      }
      if (p.siteTransfer && p.siteTransfer.status === 'published' && p.siteTransfer.publishedAt && new Date(p.siteTransfer.publishedAt) >= cutoff) {
        events.push({ date: p.siteTransfer.publishedAt.slice(0, 10), time: p.siteTransfer.publishedAt, label: 'Сайт zhivoy-ai.ru', topic: p.siteTransfer.title || p.topic });
      }
    });
    events.sort((a, b) => b.time.localeCompare(a.time));
    const byDate = {};
    events.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
    const dates = Object.keys(byDate).sort().reverse();
    const list = $('#history-list');
    if (!dates.length) { list.innerHTML = '<div class="empty-state">За последние 7 дней публикаций не было.</div>'; return; }
    list.innerHTML = dates.map((d) => `
      <div class="history-day">
        <div class="h-date">${formatDateRu(d)}</div>
        ${byDate[d].map((e) => `
          <div class="history-item">
            <span class="topic">${escapeHtml(e.label)} — ${escapeHtml(e.topic || 'Без темы')}</span>
            <span class="time">${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(e.time))}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  /* ===================== Рендер: Настройки ===================== */
  function renderSettings() {
    const s = state.settings;
    $('#set-gh-token').value = s.ghToken;
    $('#set-data-owner').value = s.dataOwner;
    $('#set-data-repo').value = s.dataRepo;
    $('#set-data-branch').value = s.dataBranch;
    $('#set-site-owner').value = s.siteOwner;
    $('#set-site-repo').value = s.siteRepo;
    $('#set-site-branch').value = s.siteBranch;
    $('#set-gas-url').value = s.gasUrl;
    $('#set-gas-token').value = s.gasToken;
    $('#set-tg-chat').value = s.tgChatId;
    $('#set-vk-group').value = s.vkGroupId;
    $('#set-tg-start').value = s.tgStart;
    $('#set-vk-start').value = s.vkStart;
    $('#set-vc-start').value = s.vcStart;
  }
  function readSettingsForm() {
    return {
      ghToken: $('#set-gh-token').value.trim(),
      dataOwner: $('#set-data-owner').value.trim() || DEFAULT_SETTINGS.dataOwner,
      dataRepo: $('#set-data-repo').value.trim() || DEFAULT_SETTINGS.dataRepo,
      dataBranch: $('#set-data-branch').value.trim() || DEFAULT_SETTINGS.dataBranch,
      siteOwner: $('#set-site-owner').value.trim() || DEFAULT_SETTINGS.siteOwner,
      siteRepo: $('#set-site-repo').value.trim() || DEFAULT_SETTINGS.siteRepo,
      siteBranch: $('#set-site-branch').value.trim() || DEFAULT_SETTINGS.siteBranch,
      gasUrl: $('#set-gas-url').value.trim(),
      gasToken: $('#set-gas-token').value.trim(),
      tgChatId: $('#set-tg-chat').value.trim(),
      vkGroupId: $('#set-vk-group').value.trim(),
      tgStart: $('#set-tg-start').value || DEFAULT_SETTINGS.tgStart,
      vkStart: $('#set-vk-start').value || DEFAULT_SETTINGS.vkStart,
      vcStart: $('#set-vc-start').value || DEFAULT_SETTINGS.vcStart,
    };
  }

  /* ===================== Редактор поста ===================== */
  function makeStub(platform, dateStr) {
    return {
      id: 'p_' + platform + '_' + dateStr + '_' + Math.random().toString(36).slice(2, 7),
      platform, scheduledDate: dateStr, topic: '', bodyText: '', images: [],
      status: 'draft', source: 'manual', createdAt: nowIso(), updatedAt: nowIso(),
      siteTransfer: { status: 'none' },
    };
  }

  function openEditor(platform, post) {
    state.currentEditorId = post ? post.id : null;
    state.currentEditorIsNew = !post;
    state.currentEditorDraft = post ? JSON.parse(JSON.stringify(post)) : makeStub(platform, todayStr());
    renderEditor();
    switchView('editor');
  }

  function renderEditor() {
    const post = state.currentEditorDraft;
    const def = PLATFORM_DEFS[post.platform];
    $('#editor-plat-name').textContent = def.label;
    $('#editor-date').textContent = formatDateRu(post.scheduledDate);
    $('#editor-badge').textContent = STATUS_LABEL[post.status];
    $('#editor-badge').className = 'badge ' + post.status;
    $('#editor-topic').value = post.topic || '';
    $('#editor-text').value = post.bodyText || '';

    const dupBox = $('#editor-dup-warning');
    if (post.possibleDuplicateOf) {
      const other = state.posts.find((p) => p.id === post.possibleDuplicateOf);
      dupBox.innerHTML = other ? `<div class="warn-box">⚠ Похоже на пост от ${formatDateRu(other.scheduledDate)} (${PLATFORM_DEFS[other.platform].label}): «${escapeHtml(other.topic)}». Проверьте, не повтор ли тема.</div>` : '';
    } else dupBox.innerHTML = '';

    renderImageGrid('#editor-cover-grid', post.images.filter((i) => i.role === 'cover'), 'cover');
    renderImageGrid('#editor-inline-grid', post.images.filter((i) => i.role === 'inline'), 'inline');

    $('#btn-publish-tg').hidden = def.group !== 'tg';
    $('#btn-publish-vk').hidden = def.group !== 'vk';
    $('#btn-copy-vc').hidden = def.group !== 'vc';
    $('#editor-publish-status').textContent = post.status === 'published' && post.publishedAt ? `Опубликовано ${formatDateTimeRu(post.publishedAt)}` : '';

    let markBtn = $('#btn-mark-published');
    if (!markBtn) {
      markBtn = document.createElement('button');
      markBtn.className = 'btn ghost';
      markBtn.id = 'btn-mark-published';
      markBtn.style.marginTop = '10px';
      markBtn.textContent = 'Отметить как опубликовано (вручную)';
      markBtn.addEventListener('click', markPublishedManually);
      $('#editor-publish-card').appendChild(markBtn);
    }
    markBtn.hidden = post.status === 'published';

    renderSiteTransferForm(post);
  }

  function renderImageGrid(sel, images, role) {
    const grid = $(sel);
    grid.innerHTML = images.map((img, i) => `
      <div class="image-slot">
        <img src="${img.url}" alt="">
        <button class="remove" data-role="${role}" data-idx="${i}">×</button>
      </div>
    `).join('');
    grid.querySelectorAll('.remove').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const post = state.currentEditorDraft;
        const idx = Number(btn.dataset.idx);
        const inRole = post.images.filter((i) => i.role === btn.dataset.role);
        const target = inRole[idx];
        post.images = post.images.filter((i) => i !== target);
        renderEditor();
      });
    });
  }

  async function handleImageUpload(file, role) {
    if (!file) return;
    if (!settingsReady()) { toast('Сначала настройте подключение к GitHub', 'error'); return; }
    try {
      const post = state.currentEditorDraft;
      const base64 = await readFileAsBase64(file);
      const cleanName = file.name.replace(/[^a-zA-Z0-9а-яА-Я._-]/g, '_');
      const path = `images/${post.id}/${Date.now()}_${cleanName}`;
      const up = await dataStore().putBinary(path, base64, `Картинка (${role}) для ${post.id}`);
      post.images.push({ name: cleanName, path: up.path, url: up.rawUrl, role });
      renderEditor();
      toast('Картинка загружена, не забудьте сохранить пост', 'success');
    } catch (e) {
      toast('Не удалось загрузить картинку: ' + e.message, 'error');
    }
  }

  /** Переносит текущие значения полей темы/текста из формы в объект черновика. */
  function syncDraftFromForm() {
    const post = state.currentEditorDraft;
    post.topic = $('#editor-topic').value.trim();
    post.bodyText = $('#editor-text').value;
    return post;
  }

  async function saveEditorPost() {
    const post = syncDraftFromForm();
    post.updatedAt = nowIso();
    if (post.status !== 'published') post.status = 'edited';
    const dup = findPossibleDuplicate(post, state.posts.filter((p) => p.id !== post.id));
    post.possibleDuplicateOf = dup ? dup.post.id : null;
    try {
      await persistPosts((current) => {
        const idx = current.findIndex((p) => p.id === post.id);
        if (idx === -1) return [...current, post];
        const next = current.slice(); next[idx] = post; return next;
      }, `Сохранён пост ${post.id}`);
      state.currentEditorIsNew = false;
      toast('Пост сохранён', 'success');
      renderEditor();
      renderToday();
    } catch (e) {
      toast('Не удалось сохранить: ' + e.message, 'error');
    }
  }

  async function markPublishedManually() {
    const post = syncDraftFromForm();
    post.status = 'published';
    post.publishedAt = nowIso();
    await saveEditorPostSilently(post);
    renderEditor(); renderToday(); renderHistory();
  }

  async function saveEditorPostSilently(post) {
    try {
      await persistPosts((current) => {
        const idx = current.findIndex((p) => p.id === post.id);
        if (idx === -1) return [...current, post];
        const next = current.slice(); next[idx] = post; return next;
      }, `Обновлён пост ${post.id}`);
    } catch (e) { toast('Ошибка сохранения: ' + e.message, 'error'); }
  }

  async function fetchImageBase64(img) {
    const b64 = await dataStore().getRawBase64(img.path);
    if (!b64) throw new Error('Картинка не найдена в репозитории: ' + img.path);
    return b64;
  }

  async function publishTelegram() {
    const post = syncDraftFromForm();
    if (!state.settings.tgChatId) { toast('Укажите chat_id Telegram в настройках', 'error'); return; }
    $('#editor-publish-status').innerHTML = '<span class="spinner"></span> Публикую в Telegram…';
    try {
      const images = [];
      for (const img of post.images) {
        images.push({ filename: img.name, mimeType: mimeFromExt(extOf(img.name)), base64: await fetchImageBase64(img) });
      }
      await callGas('publishTelegram', { chatId: state.settings.tgChatId, text: stripInternalNote(post.bodyText), images });
      post.status = 'published'; post.publishedAt = nowIso();
      await saveEditorPostSilently(post);
      toast('Опубликовано в Telegram', 'success');
      renderEditor(); renderToday(); renderHistory();
    } catch (e) {
      toast('Ошибка публикации в Telegram: ' + e.message, 'error');
      $('#editor-publish-status').textContent = '';
    }
  }

  async function publishVk() {
    const post = syncDraftFromForm();
    if (!state.settings.vkGroupId) { toast('Укажите id группы ВКонтакте в настройках', 'error'); return; }
    $('#editor-publish-status').innerHTML = '<span class="spinner"></span> Публикую в ВК…';
    try {
      const images = [];
      for (const img of post.images) {
        images.push({ filename: img.name, mimeType: mimeFromExt(extOf(img.name)), base64: await fetchImageBase64(img) });
      }
      await callGas('publishVk', { groupId: state.settings.vkGroupId, text: stripInternalNote(post.bodyText), images });
      post.status = 'published'; post.publishedAt = nowIso();
      await saveEditorPostSilently(post);
      toast('Опубликовано в ВК', 'success');
      renderEditor(); renderToday(); renderHistory();
    } catch (e) {
      toast('Ошибка публикации в ВК: ' + e.message, 'error');
      $('#editor-publish-status').textContent = '';
    }
  }

  async function copyForVc() {
    const post = syncDraftFromForm();
    try {
      await navigator.clipboard.writeText(stripInternalNote(post.bodyText));
      toast('Текст скопирован — вставьте на vc.ru, затем отметьте как опубликовано', 'success');
    } catch (e) {
      toast('Не удалось скопировать: ' + e.message, 'error');
    }
  }

  /* ===================== Перенос на сайт ===================== */
  function renderSiteTransferForm(post) {
    const st = post.siteTransfer || { status: 'none' };
    $('#site-title').value = st.title || post.topic || '';
    $('#site-slug').value = st.slug || '';
    $('#site-excerpt').value = st.excerpt || '';
    $('#site-content').value = st.content || '';
    const chips = $('#site-tag-chips');
    chips.innerHTML = TAGS.map((t) => `<button type="button" class="chip${st.tag === t ? ' active' : ''}" data-tag="${t}">${t}</button>`).join('');
    chips.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
    }));
    $('#site-publish-status').textContent = st.status === 'published'
      ? `Опубликовано на сайте ${formatDateTimeRu(st.publishedAt)}: ${st.articleUrl || ''}` : '';
  }

  function prepareSiteRewrite() {
    const post = syncDraftFromForm();
    const cleaned = stripEmojis(stripTrailingDecoration(stripInternalNote(post.bodyText)));
    let html = '';
    const cover = post.images.find((i) => i.role === 'cover');
    if (cover) html += `<img src="cover.${extOf(cover.name)}" alt="Обложка статьи" style="max-width: 100%; border-radius: 12px; margin: 20px 0;">`;
    html += textToArticleHtml(cleaned);
    post.images.filter((i) => i.role === 'inline').forEach((img, i) => {
      html += `<img src="image${i + 1}.${extOf(img.name)}" alt="" style="max-width: 100%; border-radius: 12px; margin: 20px 0;">`;
    });
    html += CTA_HTML;

    const firstPara = cleaned.split(/\n{2,}/)[0] || '';
    const firstParaText = firstPara.split('\n').map((l) => l.trim().replace(/^[«"“]|[»"”]$/g, '')).join(' ').trim();
    const excerpt = firstParaText.length > 155 ? firstParaText.slice(0, 152) + '…' : firstParaText;
    const slug = slugify(post.topic || 'post-' + post.scheduledDate);

    post.siteTransfer = {
      status: 'pending', title: post.topic || 'Без названия', slug, excerpt, tag: post.siteTransfer && post.siteTransfer.tag || TAGS[0],
      content: html, preparedAt: nowIso(),
    };
    renderSiteTransferForm(post);
    saveEditorPostSilently(post);
    toast('Черновик рерайта подготовлен — проверьте и отредактируйте перед публикацией', 'success');
  }

  async function publishToSite() {
    const post = state.currentEditorDraft;
    const title = $('#site-title').value.trim();
    const slug = $('#site-slug').value.trim();
    const excerpt = $('#site-excerpt').value.trim();
    const content = $('#site-content').value;
    const tagChip = $('#site-tag-chips .chip.active');
    const tag = tagChip ? tagChip.dataset.tag : TAGS[0];
    if (!title || !slug || !content) { toast('Заполните заголовок, URL и текст статьи', 'error'); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { toast('URL должен быть латиницей, цифрами и дефисами', 'error'); return; }

    $('#site-publish-status').innerHTML = '<span class="spinner"></span> Переношу на сайт…';
    try {
      const site = siteStore();
      const cover = post.images.find((i) => i.role === 'cover');
      if (cover) {
        const b64 = await fetchImageBase64(cover);
        await site.putBinary(`articles/${slug}/cover.${extOf(cover.name)}`, b64, `Обложка статьи ${slug}`);
      }
      const inlineImages = post.images.filter((i) => i.role === 'inline');
      for (let i = 0; i < inlineImages.length; i++) {
        const b64 = await fetchImageBase64(inlineImages[i]);
        await site.putBinary(`articles/${slug}/image${i + 1}.${extOf(inlineImages[i].name)}`, b64, `Картинка статьи ${slug}`);
      }
      const existingData = await site.getJson(`articles/${slug}/data.json`);
      await site.putJson(`articles/${slug}/data.json`, { title, date: todayStr(), tag, excerpt, content }, `Публикация статьи: ${title}`, existingData ? existingData.sha : undefined);

      const manifestRes = await site.getJson('articles/manifest.json');
      const manifest = (manifestRes ? manifestRes.json : []).filter((a) => a.slug !== slug);
      manifest.unshift({ slug, title, date: todayStr(), tag, excerpt });
      await site.putJson('articles/manifest.json', manifest, `Добавление статьи в manifest: ${title}`, manifestRes ? manifestRes.sha : undefined);

      post.siteTransfer = {
        status: 'published', title, slug, excerpt, tag, content,
        publishedAt: nowIso(), articleUrl: `https://zhivoy-ai.ru/article-template.html?article=${slug}`,
      };
      await saveEditorPostSilently(post);
      toast('Статья опубликована на сайте', 'success');
      renderSiteTransferForm(post);
      renderToday(); renderHistory(); renderCounters();
    } catch (e) {
      toast('Ошибка переноса на сайт: ' + e.message, 'error');
      $('#site-publish-status').textContent = '';
    }
  }

  /* ===================== Навигация ===================== */
  function switchView(name) {
    $all('.view').forEach((v) => v.classList.remove('active'));
    const el = $('#view-' + name);
    if (el) el.classList.add('active');
    $all('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    window.scrollTo(0, 0);
    if (name === 'settings') renderSettings();
  }

  function renderAll() {
    renderToday();
    renderCounters();
    renderHistory();
  }

  /* ===================== Инициализация ===================== */
  function initApp() {
    switchView('today');
    loadAll();
  }

  function wireEvents() {
    $('#gate-submit').addEventListener('click', gateSubmit);
    $('#gate-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') gateSubmit(); });
    $('#gate-password2').addEventListener('keydown', (e) => { if (e.key === 'Enter') gateSubmit(); });
    $('#gate-reset').addEventListener('click', (e) => { e.preventDefault(); resetDevice(); });

    $('#btn-lock').addEventListener('click', lockApp);
    $all('.tab-btn').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
    $('#btn-editor-back').addEventListener('click', () => switchView('today'));

    $('#btn-sync').addEventListener('click', syncGmail);
    $('#btn-refresh-stats').addEventListener('click', refreshStats);
    $('#btn-vc-save').addEventListener('click', saveVcCounter);

    $('#btn-save-settings').addEventListener('click', () => {
      saveSettings(readSettingsForm());
      $('#settings-save-status').innerHTML = '<p class="hint-sm" style="color:var(--success)">Сохранено</p>';
      loadAll();
    });
    $('#btn-test-github').addEventListener('click', async () => {
      saveSettings(readSettingsForm());
      const box = $('#github-test-result');
      box.textContent = 'Проверяю…';
      try {
        await dataStore().testConnection();
        await siteStore().testConnection();
        box.textContent = '✓ Оба репозитория доступны';
      } catch (e) { box.textContent = '✗ ' + e.message; }
    });
    $('#btn-test-gas').addEventListener('click', async () => {
      saveSettings(readSettingsForm());
      const box = $('#gas-test-result');
      box.textContent = 'Проверяю…';
      try { await callGas('ping', {}); box.textContent = '✓ Apps Script отвечает'; }
      catch (e) { box.textContent = '✗ ' + e.message; }
    });
    $('#btn-change-password').addEventListener('click', () => {
      if (!confirm('Выйти и задать новый пароль на этом устройстве?')) return;
      localStorage.removeItem(LS_PWHASH);
      lockApp();
    });

    $('#editor-cover-drop').addEventListener('click', () => $('#editor-cover-input').click());
    $('#editor-cover-input').addEventListener('change', (e) => { handleImageUpload(e.target.files[0], 'cover'); e.target.value = ''; });
    $('#editor-inline-drop').addEventListener('click', () => $('#editor-inline-input').click());
    $('#editor-inline-input').addEventListener('change', (e) => { handleImageUpload(e.target.files[0], 'inline'); e.target.value = ''; });

    $('#btn-editor-save').addEventListener('click', saveEditorPost);
    $('#btn-publish-tg').addEventListener('click', publishTelegram);
    $('#btn-publish-vk').addEventListener('click', publishVk);
    $('#btn-copy-vc').addEventListener('click', copyForVc);
    $('#btn-site-prepare').addEventListener('click', prepareSiteRewrite);
    $('#btn-site-publish').addEventListener('click', publishToSite);
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    gateInit();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW register failed', e));
    }
  });
})();
