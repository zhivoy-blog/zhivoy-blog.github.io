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

  /* ===================== Генератор статической страницы статьи ===================== */
  /* Раньше все статьи открывались через один article-template.html?article=slug и
     подтягивали контент через JS уже после загрузки — из-за этого title/description/og:*
     оставались одинаковыми (общими) для всех статей в сыром HTML, который видят
     соцсети и часть поисковиков. Эта функция строит отдельную статическую страницу
     articles/<slug>/index.html с правильными мета-тегами конкретной статьи; сам текст
     статьи она по-прежнему подгружает через fetch('data.json') — как единственный
     источник правды остаётся data.json, а не дублирующаяся копия HTML. */
  function escapeHtmlAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function truncateForMeta(text, maxLen) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    const cut = clean.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
  /* <title>/og:title не должны обрезаться поисковой выдачей на середине слова —
     Google обычно показывает не больше ~60 символов. Полный заголовок при этом
     остаётся в <h1> статьи как есть, эта функция трогает только мета-теги.
     Ищем самую длинную точку обрезки (граница слова, «:»/«—»/открывающая «[»,
     или конец предложения/закрывающая «»), которая не рвёт слово пополам,
     не оставляет незакрытую скобку/кавычку и не обрывается на предлоге,
     местоимении или числе без единицы — такое хвостовое слово тоже отбрасываем. */
  const TITLE_DANGLING_WORDS = new Set([
    'и', 'а', 'но', 'не', 'на', 'из', 'за', 'для', 'что', 'как', 'это', 'у', 'к', 'с', 'в', 'о', 'об', 'обо', 'со', 'во',
    'до', 'от', 'по', 'же', 'ли', 'бы', 'то', 'из-за', 'из-под', 'ради', 'вроде', 'кроме', 'чуть',
    'какой', 'какая', 'какое', 'какие', 'чей', 'чья', 'чьё', 'чьи', 'любой', 'любая', 'любое', 'любые',
    'всех', 'всей', 'всего', 'весь', 'вся', 'всё', 'одной', 'одного', 'этой', 'этого', 'той', 'того',
    'твою', 'твой', 'твоё', 'его', 'её', 'их', 'свою', 'своего', 'своей',
    'он', 'она', 'оно', 'они', 'ему', 'ей', 'им', 'нём', 'ней',
    'который', 'которая', 'которое', 'которые', 'которых', 'которым', 'которой',
    'чтобы', 'если', 'когда', 'пока', 'хотя', 'потому', 'поэтому', 'словно', 'будто', 'лишь', 'только',
    'ещё', 'уже', 'такой', 'такая', 'такое', 'такие', 'так', 'надо', 'нужно', 'можно', 'нельзя',
  ]);
  function shortenTitle(title, maxLen) {
    const clean = String(title || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    const MIN_KEEP = 12;
    const budget = clean.slice(0, maxLen);
    const positions = new Set();
    let m;
    const spaceRe = /\s/g;
    while ((m = spaceRe.exec(budget))) positions.add(m.index);
    const beforeRe = /[:—[]/g;
    while ((m = beforeRe.exec(budget))) positions.add(m.index);
    const afterRe = /[.!?»]/g;
    while ((m = afterRe.exec(budget))) positions.add(m.index + 1);

    const isBalanced = (s) => s.split('[').length - 1 <= s.split(']').length - 1
      && s.split('«').length - 1 <= s.split('»').length - 1;
    const lastWordOk = (s) => {
      const words = s.trim().split(' ');
      const w = words[words.length - 1].toLowerCase().replace(/^[«"]+|[»":,.!?—]+$/g, '');
      return w !== '' && !TITLE_DANGLING_WORDS.has(w) && !/^\d+$/.test(w);
    };

    let best = null;
    for (const pos of Array.from(positions).sort((a, b) => b - a)) {
      if (pos < MIN_KEEP || pos > maxLen) continue;
      const cand = budget.slice(0, pos).trim();
      if (!cand || !isBalanced(cand) || !lastWordOk(cand)) continue;
      best = cand;
      break;
    }
    let trimmed = best || budget.trim();
    if (!trimmed.endsWith('»')) trimmed = trimmed.replace(/[:,;.\-–—]+$/, '').trim();
    trimmed = trimmed.replace(/\.{2,}$/, '').trim();
    return trimmed;
  }
  const SITE_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23113154'/%3E%3Ctext x='50' y='68' font-size='58' font-family='Arial, sans-serif' font-weight='bold' fill='%23007aff' text-anchor='middle'%3EЖ%3C/text%3E%3C/svg%3E";

  const TITLE_TAG_SUFFIX = ' — Живой ИИ';

  function buildArticlePageHtml({ slug, title, excerpt, ogImageFile }) {
    const safeShortTitle = escapeHtmlAttr(shortenTitle(title, 60 - TITLE_TAG_SUFFIX.length));
    const description = escapeHtmlAttr(truncateForMeta(excerpt, 155));
    const canonicalUrl = `https://zhivoy-ai.ru/articles/${slug}/`;
    const ogImage = ogImageFile
      ? `https://zhivoy-ai.ru/articles/${slug}/${ogImageFile}`
      : 'https://zhivoy-ai.ru/og-cover.jpg';

    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title id="page-title">${safeShortTitle}${TITLE_TAG_SUFFIX}</title>
<meta name="description" content="${description}">

<link rel="icon" href="${SITE_FAVICON}">

<link rel="canonical" href="${canonicalUrl}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Живой ИИ">
<meta property="og:title" content="${safeShortTitle}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${canonicalUrl}">
<meta name="twitter:card" content="summary_large_image">

<link rel="stylesheet" href="../../article-style.css">
</head>
<body>

<header class="site-header">
<p class="site-logo">Живой ИИ</p>
<div class="site-links">
<a href="https://vk.ru/zhivoy_ai" target="_blank" rel="noopener noreferrer" class="btn-link vk">Мы в ВК</a>
<a href="https://vc.ru/id6025411" target="_blank" rel="noopener noreferrer" class="btn-link vc">vc.ru</a>
<a href="https://t.me/zhivoy_ii" target="_blank" rel="noopener noreferrer" class="btn-link tg">Telegram</a>
<a href="../../tools.html" class="btn-link tools">🛠️ Инструменты</a>
</div>
</header>

<a href="../../index.html" class="back-link">← Назад к статьям</a>

<article id="article-content">
<p>Загрузка статьи...</p>
</article>

<footer class="site-footer">
<div class="footer-links">
<a href="https://vk.ru/zhivoy_ai" target="_blank" rel="noopener noreferrer">ВКонтакте</a>
<a href="https://vc.ru/id6025411" target="_blank" rel="noopener noreferrer">vc.ru</a>
<a href="https://t.me/zhivoy_ii" target="_blank" rel="noopener noreferrer">Telegram</a>
</div>
<p>© Живой ИИ</p>
</footer>

<script src="../../article-script.js"></script>
<script>
(function() {
fetch('data.json?v=' + Date.now(), { cache: 'no-store' })
.then(function(response) {
if (!response.ok) throw new Error('Not found');
return response.json();
})
.then(function(data) {
var tempDiv = document.createElement('div');
tempDiv.innerHTML = data.content;

tempDiv.querySelectorAll('video').forEach(function(video) {
video.setAttribute('playsinline', '');
video.setAttribute('webkit-playsinline', '');
video.setAttribute('loop', '');
video.setAttribute('muted', '');
video.setAttribute('controls', '');
video.setAttribute('preload', 'auto');
video.style.width = '100%';
video.style.maxWidth = '100%';
});

var firstP = tempDiv.querySelector('p');
if (firstP) {
var ctaHtml = '<div class="inline-cta">' +
'<p>Такие разборы выходят у нас в Telegram каждый день</p>' +
'<a href="https://t.me/zhivoy_ii" target="_blank" rel="noopener noreferrer" class="inline-cta-btn">Перейти в Telegram →</a>' +
'</div>';
firstP.insertAdjacentHTML('afterend', ctaHtml);
}

document.getElementById('article-content').innerHTML = tempDiv.innerHTML;

setTimeout(function() {
if (typeof initAll === 'function') {
initAll();
}
}, 100);
})
.catch(function() {
document.getElementById('article-content').innerHTML = '<p style="color:#d1d1d6; text-align:center; padding:40px 0;">❌ Ошибка загрузки статьи. <a href="../../index.html" style="color:var(--accent-blue);">Вернуться к списку</a></p>';
});
})();
</script>
</body>
</html>
`;
  }

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
  function formatDateShortRu(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
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
  // Вопрос + варианты-реакции с эмодзи-буллетами ("Попробуете...? 🎯 — вариант") — формат
  // вовлечения для соцсетей, на статичной странице сайта не работает (не на что нажать),
  // поэтому такой блок целиком убирается из версии для сайта. Запускать до stripEmojis —
  // наличие эмодзи в начале строки-варианта помогает надёжно отличить его от обычного текста.
  function stripPollBlock(text) {
    const lines = String(text || '').split('\n');
    const optionRe = /^(\p{Extended_Pictographic}[️‍\p{Emoji_Modifier}]*\s*)+[-–—]\s+\S/u;
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (/\?\s*$/.test(trimmed)) {
        let j = i + 1;
        while (j < lines.length && optionRe.test(lines[j].trim())) j++;
        if (j - i - 1 >= 2) { i = j; continue; }
      }
      out.push(lines[i]);
      i++;
    }
    return out.join('\n');
  }
  // Строки полностью в кавычках (обычно готовый промт) оформляем как цитату,
  // остальной текст группируем в абзацы по пустым строкам.
  // *текст* → жирный, _текст_ → курсив — простая разметка, которую расставляет панель
  // форматирования (выделить → «Жирный»/«Курсив»). Применяется к уже экранированной строке,
  // так как * и _ не задействованы в HTML-экранировании — порядок безопасен.
  function applyInlineMarkers(escapedText) {
    return escapedText
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>');
  }
  function textToArticleHtml(text) {
    const lines = String(text || '').split('\n');
    let html = '';
    let buffer = [];
    const flush = () => {
      if (buffer.length) {
        html += `<p>${buffer.map((l) => applyInlineMarkers(escapeHtml(l))).join('<br>')}</p>`;
        buffer = [];
      }
    };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { flush(); return; }
      if (/^[«"“].+[»"”]$/.test(line) && line.length > 15) {
        flush();
        const inner = line.replace(/^[«"“]/, '').replace(/[»"”]$/, '');
        html += `<blockquote style="margin:16px 0;padding:10px 16px;border-left:3px solid #007aff;background:rgba(0,122,255,0.08);border-radius:8px;font-style:italic;">${applyInlineMarkers(escapeHtml(inner))}</blockquote>`;
      } else {
        buffer.push(line);
      }
    });
    flush();
    return html;
  }
  // Превью в стиле Telegram/ВК: первая строка — жирным заголовком, строки в «кавычках» —
  // цитатой (зелёная рамка, как нативная цитата в Telegram), *жирный*/_курсив_ — инлайн,
  // остальное — обычные абзацы. Эмодзи/хэштеги здесь не убираются — это часть поста для соцсетей.
  // Тот же HTML идёт в буфер обмена при копировании (см. copyPostText).
  function textToPreviewHtml(text) {
    const lines = String(text || '').split('\n');
    let html = '';
    let buffer = [];
    let isFirstLine = true;
    const flush = () => {
      if (buffer.length) {
        html += `<p>${buffer.map((l) => applyInlineMarkers(escapeHtml(l))).join('<br>')}</p>`;
        buffer = [];
      }
    };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { flush(); return; }
      if (/^[«"“].+[»"”]$/.test(line) && line.length > 15) {
        flush();
        const inner = line.replace(/^[«"“]/, '').replace(/[»"”]$/, '');
        html += `<blockquote>${applyInlineMarkers(escapeHtml(inner))}</blockquote>`;
        isFirstLine = false;
        return;
      }
      if (isFirstLine) {
        flush();
        html += `<p><strong>${applyInlineMarkers(escapeHtml(line))}</strong></p>`;
        isFirstLine = false;
        return;
      }
      buffer.push(line);
    });
    flush();
    return html || '<span class="preview-empty">Текст пока пуст</span>';
  }
  // Для plain-text копии/фолбэка — убираем служебные звёздочки/подчёркивания разметки,
  // оставляя «кавычки» как есть (и в чистом виде читаются как цитата).
  function stripFormatMarkersToPlain(text) {
    return String(text || '')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1');
  }
  // Выделили текст в поле → обернули *жирным*/_курсивом_ либо вынесли отдельной строкой
  // в «кавычки» как цитату. Работает через selectionStart/End обычного textarea.
  function applyFormat(textareaId, type) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    if (!selected) { toast('Сначала выделите текст', 'error'); return; }
    let before = el.value.slice(0, start);
    let after = el.value.slice(end);
    let inserted, selStart, selEnd;
    if (type === 'bold') {
      inserted = `*${selected}*`;
      selStart = start + 1; selEnd = start + 1 + selected.length;
    } else if (type === 'italic') {
      inserted = `_${selected}_`;
      selStart = start + 1; selEnd = start + 1 + selected.length;
    } else if (type === 'clear') {
      // Снимает *жирный*/_курсив_ внутри выделения и «кавычки» цитаты по краям.
      inserted = selected
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/_([^_\n]+)_/g, '$1')
        .replace(/^[«"“]\s*/, '').replace(/\s*[»"”]$/, '');
      selStart = start; selEnd = start + inserted.length;
    } else {
      const gapBefore = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const gapAfter = after.length === 0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
      before += gapBefore;
      after = gapAfter + after;
      inserted = `«${selected.trim()}»`;
      selStart = before.length; selEnd = before.length + inserted.length;
    }
    el.value = before + inserted + after;
    el.focus();
    el.setSelectionRange(selStart, selEnd);
    el.dispatchEvent(new Event('input', { bubbles: true }));
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

  /* ===================== Журнал подписчиков (для динамики по дням) ===================== */
  // Точка отсчёта нового журнала — актуальные цифры на момент, когда его завели.
  // Подставляется один раз, при первом запуске обновлённого приложения (пока в
  // counters.json нет counters.history вообще); дальше журнал живёт сам через
  // withHistoryEntry ниже и эта функция больше ничего не трогает.
  const SEED_HISTORY_AT = '2026-09-17T14:06:00.000Z'; // 17 сентября 2026, 17:06 (МСК)
  const SEED_HISTORY_VALUES = { tg: 30, vk: 38, vc: 15 };
  // Сидирует по группам, а не «весь counters.history целиком или ничего» — так журнал
  // сам восстанавливается, если история отсутствует только у части площадок (например,
  // из-за прерванной записи), а не только при полностью пустом counters.history.
  function ensureSeedHistory(counters) {
    const history = { ...(counters.history || {}) };
    let changed = false;
    Object.keys(SEED_HISTORY_VALUES).forEach((group) => {
      if (!history[group] || !history[group].length) {
        history[group] = [{ date: SEED_HISTORY_AT.slice(0, 10), at: SEED_HISTORY_AT, value: SEED_HISTORY_VALUES[group] }];
        changed = true;
      }
    });
    return changed ? { ...counters, history } : counters;
  }

  // Добавляет запись в журнал площадки group, только если значение реально изменилось
  // относительно последней записи — иначе повторные автообновления (TG/ВК) заваливали бы
  // журнал одинаковыми строками.
  function withHistoryEntry(counters, group, value, atIso) {
    if (value == null) return counters;
    const history = counters.history || {};
    const list = history[group] || [];
    const last = list[list.length - 1];
    if (last && last.value === value) return counters;
    const entry = { date: atIso.slice(0, 10), at: atIso, value };
    return { ...counters, history: { ...history, [group]: [...list, entry] } };
  }

  // Изменение числа подписчиков для карточки на экране «Счётчики»: сравниваем текущее
  // значение с последней записью журнала, датированной СТРОГО раньше сегодня. Если
  // это была именно вчерашняя запись — подписываем «за сегодня» как в примере из
  // задачи; если разрыв больше суток (обычная ситуация для vc.ru, где ввод не
  // ежедневный) — честно подписываем «с 10 сен» вместо того, чтобы выдавать
  // накопленную за несколько дней разницу за дневную.
  function subscriberDeltaInfo(group) {
    const c = state.counters[group] || {};
    const current = c.subscribers;
    if (current == null) return null;
    const history = (state.counters.history && state.counters.history[group]) || [];
    const today = todayStr();
    const prevEntries = history.filter((e) => e.date < today);
    if (!prevEntries.length) return null;
    const prev = prevEntries[prevEntries.length - 1];
    const delta = current - prev.value;
    const gap = daysBetween(prev.date, today);
    const period = gap === 1 ? 'за сегодня' : `с ${formatDateShortRu(prev.date)}`;
    if (delta === 0) return { text: `без изменений ${gap === 1 ? '' : period}`.trim(), cls: 'flat' };
    const sign = delta > 0 ? '+' : '−';
    return { text: `${sign}${Math.abs(delta)} ${period}`, cls: delta > 0 ? 'up' : 'down' };
  }

  // Вставляет запись в отсортированный по дате журнал (по возрастанию), заменяя
  // существующую запись за ту же дату, если она уже есть — так форма «задним числом»
  // безопасно исправляет опечатку, а не плодит дубли на одну дату.
  function insertSortedEntry(list, entry) {
    const next = list.filter((e) => e.date !== entry.date);
    next.push(entry);
    next.sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at));
    return next;
  }

  // Форма «Добавить запись задним числом» на вкладке «История» — для случаев вроде
  // «журнал завели только сегодня, а вчерашнее значение помню и хочу видеть дельту
  // уже сейчас», а не ждать следующего реального обновления. Трогает только
  // counters.history[group] — текущие subscribers/updatedAt (то, что показывается на
  // «Счётчиках» как самое свежее значение) этой формой не меняются.
  async function saveBackdatedEntry() {
    const group = $('#backfill-platform').value;
    const dateStr = $('#backfill-date').value;
    const val = parseInt($('#backfill-value').value, 10);
    if (!dateStr) { toast('Выберите дату', 'error'); return; }
    if (dateStr >= todayStr()) { toast('Эта форма только для прошедших дат — сегодняшнее значение сохраняется кнопками на «Счётчиках»', 'error'); return; }
    if (Number.isNaN(val) || val < 0) { toast('Введите число подписчиков', 'error'); return; }
    try {
      const at = dateStr + 'T12:00:00.000Z';
      await persistCounters((c) => {
        const history = { ...(c.history || {}) };
        history[group] = insertSortedEntry(history[group] || [], { date: dateStr, at, value: val });
        return { ...c, history };
      }, `Запись задним числом: ${group} ${dateStr} = ${val}`);
      toast('Запись добавлена', 'success');
      $('#backfill-value').value = '';
      renderHistory();
      renderCounters();
    } catch (e) { toast('Ошибка сохранения: ' + e.message, 'error'); }
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
      if (ensureSeedHistory(state.counters) !== state.counters) {
        try {
          await persistCounters((c) => ensureSeedHistory(c), 'Инициализация журнала подписчиков');
        } catch (e) {
          console.warn('Не удалось завести журнал подписчиков', e);
          toast('Не удалось создать журнал подписчиков: ' + e.message, 'error');
        }
      }
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
      const res = await callGas('getStats', { chatId: state.settings.tgChatId, groupId: state.settings.vkGroupId });
      const at = nowIso();
      await persistCounters((c) => {
        const tgSubs = res.telegram ? res.telegram.subscribers : (c.tg && c.tg.subscribers);
        const vkSubs = res.vk ? res.vk.subscribers : (c.vk && c.vk.subscribers);
        let next = {
          ...c,
          tg: { ...c.tg, subscribers: tgSubs, updatedAt: at },
          vk: { ...c.vk, subscribers: vkSubs, updatedAt: at },
        };
        if (res.telegram) next = withHistoryEntry(next, 'tg', tgSubs, at);
        if (res.vk) next = withHistoryEntry(next, 'vk', vkSubs, at);
        return next;
      }, 'Обновление счётчиков TG/ВК');
      toast('Счётчики обновлены', 'success');
      renderCounters();
      renderHistory();
    } catch (e) {
      toast('Не удалось обновить счётчики: ' + e.message, 'error');
    }
  }

  async function saveVcCounter() {
    const val = parseInt($('#vc-input').value, 10);
    if (Number.isNaN(val) || val < 0) { toast('Введите число подписчиков', 'error'); return; }
    try {
      const at = nowIso();
      await persistCounters((c) => withHistoryEntry({ ...c, vc: { manual: true, subscribers: val, updatedAt: at } }, 'vc', val, at), 'Обновление счётчика vc.ru вручную');
      toast('Сохранено', 'success');
      renderCounters();
      renderHistory();
    } catch (e) { toast('Ошибка сохранения: ' + e.message, 'error'); }
  }

  // Подписчики ВК — пока вручную (см. baseline/manualCount на этом же объекте для числа
  // постов, их не трогаем). Если позже заработает автообновление через Apps Script,
  // оно пишет в те же subscribers/updatedAt — переключение произойдёт само.
  async function saveVkSubscribersManually() {
    const val = parseInt($('#vk-subs-input').value, 10);
    if (Number.isNaN(val) || val < 0) { toast('Введите число подписчиков', 'error'); return; }
    try {
      const at = nowIso();
      await persistCounters((c) => withHistoryEntry({ ...c, vk: { ...(c.vk || {}), subscribers: val, updatedAt: at } }, 'vk', val, at), 'Обновление счётчика ВК вручную');
      toast('Сохранено', 'success');
      renderCounters();
      renderHistory();
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
  // TG/ВК: счётчик постов = стартовое число (введено вручную один раз) + сколько раз
  // нажали «Опубликовано» с тех пор (см. bumpManualCounter) — а не подсчёт по одному
  // посту в день на площадку, как раньше, потому что в реальности в один день по одной
  // площадке публикуется несколько отдельных постов (текст, видео, музыка).
  function manualCount(group) {
    const c = state.counters[group] || {};
    return (c.baseline || 0) + (c.manualCount || 0);
  }
  function renderCounters() {
    const grid = $('#counter-grid');
    const sitePosts = state.posts.filter((p) => p.siteTransfer && p.siteTransfer.status === 'published').length;
    const cards = [
      { key: 'tg', label: 'Telegram', subs: state.counters.tg && state.counters.tg.subscribers, updatedAt: state.counters.tg && state.counters.tg.updatedAt, count: manualCount('tg') },
      { key: 'vk', label: 'ВКонтакте', subs: state.counters.vk && state.counters.vk.subscribers, updatedAt: state.counters.vk && state.counters.vk.updatedAt, count: manualCount('vk') },
      { key: 'vc', label: 'vc.ru', subs: state.counters.vc && state.counters.vc.subscribers, updatedAt: state.counters.vc && state.counters.vc.updatedAt, count: countPublished('vc') },
      { key: 'site', label: 'Сайт zhivoy-ai.ru', subs: null, count: sitePosts },
    ];
    grid.innerHTML = cards.map((c) => {
      const delta = c.subs != null ? subscriberDeltaInfo(c.key) : null;
      return `
      <div class="counter-card">
        <div class="plat">${c.label}</div>
        <div class="num">${c.subs != null ? c.subs.toLocaleString('ru-RU') : c.count}${delta ? ` <span class="delta ${delta.cls}">${delta.text}</span>` : ''}</div>
        <div class="sub">${c.subs != null ? `подписчиков${c.updatedAt ? ' · ' + formatDateTimeRu(c.updatedAt) : ''}` : 'постов'}</div>
        ${c.subs != null ? `<div class="sub" style="margin-top:2px">постов: ${c.count}</div>` : ''}
      </div>
    `;
    }).join('');

    $('#vc-input').value = (state.counters.vc && state.counters.vc.subscribers) || '';
    $('#vc-updated').textContent = state.counters.vc && state.counters.vc.updatedAt ? 'Обновлено ' + formatDateTimeRu(state.counters.vc.updatedAt) : 'Ещё не вводилось';

    $('#vk-subs-input').value = (state.counters.vk && state.counters.vk.subscribers) || '';
    $('#vk-subs-updated').textContent = state.counters.vk && state.counters.vk.updatedAt ? 'Обновлено ' + formatDateTimeRu(state.counters.vk.updatedAt) : 'Ещё не вводилось';

    const tgBaseline = state.counters.tg && state.counters.tg.baseline;
    const vkBaseline = state.counters.vk && state.counters.vk.baseline;
    $('#tg-baseline-input').value = tgBaseline != null ? tgBaseline : '';
    $('#vk-baseline-input').value = vkBaseline != null ? vkBaseline : '';
  }
  async function saveBaseline(group, inputSel) {
    const val = parseInt($(inputSel).value, 10);
    if (Number.isNaN(val) || val < 0) { toast('Введите число', 'error'); return; }
    try {
      await persistCounters((c) => ({ ...c, [group]: { ...(c[group] || {}), baseline: val } }), `Стартовое число постов: ${group}`);
      toast('Сохранено', 'success');
      renderCounters();
    } catch (e) { toast('Ошибка сохранения: ' + e.message, 'error'); }
  }
  // Каждое нажатие «Опубликовано» на TG/ВК-посте добавляет 1 к счётчику — можно нажимать
  // несколько раз за день (отдельно для текста, видео, музыки и т.п.).
  async function bumpManualCounter(group) {
    try {
      await persistCounters((c) => ({
        ...c,
        [group]: { ...(c[group] || {}), manualCount: ((c[group] && c[group].manualCount) || 0) + 1 },
      }), `+1 опубликовано: ${group}`);
    } catch (e) {
      toast('Пост сохранён, но счётчик не обновился: ' + e.message, 'error');
    }
  }

  /* ===================== Рендер: История ===================== */
  // Простой список по дням для каждой площадки: дата, число подписчиков на тот день,
  // разница от предыдущей записи в журнале (а не обязательно от вчера — для vc.ru
  // соседние записи могут быть разнесены на недели, это ожидаемо).
  function renderSubscriberHistory() {
    const container = $('#history-subs-list');
    if (!container) return;
    const groups = [
      { key: 'tg', label: 'Telegram' },
      { key: 'vk', label: 'ВКонтакте' },
      { key: 'vc', label: 'vc.ru' },
    ];
    const blocks = groups.map((g) => {
      const history = (state.counters.history && state.counters.history[g.key]) || [];
      if (!history.length) return '';
      const rows = history.slice().reverse().map((entry, i, arr) => {
        const prev = arr[i + 1];
        const diffHtml = !prev
          ? ''
          : entry.value === prev.value
            ? '<span class="delta flat">без изменений</span>'
            : `<span class="delta ${entry.value > prev.value ? 'up' : 'down'}">${entry.value > prev.value ? '+' : '−'}${Math.abs(entry.value - prev.value)}</span>`;
        return `
          <div class="history-item">
            <span class="topic">${formatDateShortRu(entry.date)}</span>
            <span class="time">${entry.value.toLocaleString('ru-RU')}</span>
            ${diffHtml}
          </div>
        `;
      }).join('');
      return `<div class="history-day"><div class="h-date">${g.label}</div>${rows}</div>`;
    }).join('');
    container.innerHTML = blocks || '<div class="empty-state">Пока нет записей об изменении подписчиков.</div>';
  }

  function renderHistory() {
    renderSubscriberHistory();
    const events = [];
    state.posts.forEach((p) => {
      if (p.status === 'published' && p.publishedAt) {
        events.push({ date: p.publishedAt.slice(0, 10), time: p.publishedAt, label: PLATFORM_DEFS[p.platform].label, topic: p.topic });
      }
      if (p.siteTransfer && p.siteTransfer.status === 'published' && p.siteTransfer.publishedAt) {
        events.push({ date: p.siteTransfer.publishedAt.slice(0, 10), time: p.siteTransfer.publishedAt, label: 'Сайт zhivoy-ai.ru', topic: p.siteTransfer.title || p.topic });
      }
    });
    events.sort((a, b) => b.time.localeCompare(a.time));
    const byDate = {};
    events.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
    const dates = Object.keys(byDate).sort().reverse();
    const list = $('#history-list');
    if (!dates.length) { list.innerHTML = '<div class="empty-state">Публикаций пока не было.</div>'; return; }
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
    updateEditorPreview();

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
      markBtn.addEventListener('click', markPublishedManually);
      $('#editor-publish-card').appendChild(markBtn);
    }
    // TG/ВК: кнопка не прячется после публикации — жмите ещё раз на каждую отдельную
    // публикацию за день (текст, видео, музыка), это плюс 1 к счётчику каждый раз.
    if (def.group === 'tg' || def.group === 'vk') {
      markBtn.hidden = false;
      markBtn.textContent = post.status === 'published' ? 'Ещё публикация сегодня (+1 к счётчику)' : 'Отметить как опубликовано';
    } else {
      markBtn.hidden = post.status === 'published';
      markBtn.textContent = 'Отметить как опубликовано (вручную)';
    }

    renderSiteTransferForm(post);
  }

  function updateEditorPreview() {
    $('#editor-preview').innerHTML = textToPreviewHtml(stripInternalNote($('#editor-text').value));
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
    const group = PLATFORM_DEFS[post.platform].group;
    post.status = 'published';
    post.publishedAt = nowIso();
    await saveEditorPostSilently(post);
    if (group === 'tg' || group === 'vk') await bumpManualCounter(group);
    renderEditor(); renderToday(); renderHistory(); renderCounters();
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

  /** Публикация везде — вручную: копируем текст, вставляют и отмечают опубликованным сами. */
  async function copyPostText(platformLabel) {
    const post = syncDraftFromForm();
    const cleaned = stripInternalNote(post.bodyText);
    const plainText = stripFormatMarkersToPlain(cleaned);
    try {
      if (navigator.clipboard.write && window.ClipboardItem) {
        const html = textToPreviewHtml(cleaned);
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        })]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      toast(`Текст скопирован — вставьте в ${platformLabel}, затем отметьте как опубликовано`, 'success');
    } catch (e) {
      try {
        await navigator.clipboard.writeText(plainText);
        toast(`Текст скопирован — вставьте в ${platformLabel}, затем отметьте как опубликовано`, 'success');
      } catch (e2) {
        toast('Не удалось скопировать: ' + e2.message, 'error');
      }
    }
  }

  /* ===================== Перенос на сайт ===================== */
  // Для статей, опубликованных до перехода поля на обычный текст: грубо стягиваем
  // HTML обратно в читаемый текст, чтобы редактор не показывал сырые теги.
  function htmlToPlainFallback(html) {
    if (!html) return '';
    return String(html)
      .replace(/<blockquote[^>]*>/gi, '«').replace(/<\/blockquote>/gi, '»\n\n')
      .replace(/<img[^>]*>/gi, '')
      .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function renderSiteTransferForm(post) {
    const st = post.siteTransfer || { status: 'none' };
    $('#site-title').value = st.title || post.topic || '';
    $('#site-slug').value = st.slug || '';
    $('#site-excerpt').value = st.excerpt || '';
    $('#site-cover-alt').value = st.coverAlt || '';
    $('#site-content').value = st.contentText != null ? st.contentText : htmlToPlainFallback(st.content);
    const chips = $('#site-tag-chips');
    chips.innerHTML = TAGS.map((t) => `<button type="button" class="chip${st.tag === t ? ' active' : ''}" data-tag="${t}">${t}</button>`).join('');
    chips.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
    }));
    $('#site-publish-status').textContent = st.status === 'published'
      ? `Опубликовано на сайте ${formatDateTimeRu(st.publishedAt)}: ${st.articleUrl || ''}` : '';

    const cover = post.images.find((i) => i.role === 'cover');
    const inlineCount = post.images.filter((i) => i.role === 'inline').length;
    $('#site-structure-preview').innerHTML =
      '<strong>Добавится в статью автоматически (правится не здесь, а выше — через обложку/картинки поста):</strong><br>'
      + `Обложка: ${cover ? '✓ есть' : '— не добавлена'}<br>`
      + `Внутренних картинок: ${inlineCount}<br>`
      + 'Кнопка в конце статьи: «Перейти в Telegram «ЖИВОЙ ИИ»»';
  }

  function prepareSiteRewrite() {
    const post = syncDraftFromForm();
    const cleaned = stripEmojis(stripPollBlock(stripTrailingDecoration(stripInternalNote(post.bodyText))));

    const firstPara = cleaned.split(/\n{2,}/)[0] || '';
    const firstParaText = firstPara.split('\n').map((l) => l.trim().replace(/^[«"“]|[»"”]$/g, '')).join(' ').trim();
    const excerpt = firstParaText.length > 155 ? firstParaText.slice(0, 152) + '…' : firstParaText;
    const slug = slugify(post.topic || 'post-' + post.scheduledDate);

    post.siteTransfer = {
      status: 'pending', title: post.topic || 'Без названия', slug, excerpt, tag: post.siteTransfer && post.siteTransfer.tag || TAGS[0],
      contentText: cleaned, preparedAt: nowIso(),
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
    const coverAlt = $('#site-cover-alt').value.trim() || title;
    const contentText = $('#site-content').value;
    const tagChip = $('#site-tag-chips .chip.active');
    const tag = tagChip ? tagChip.dataset.tag : TAGS[0];
    if (!title || !slug || !contentText.trim()) { toast('Заполните заголовок, URL и текст статьи', 'error'); return; }
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

      let content = '';
      if (cover) content += `<img src="cover.${extOf(cover.name)}" alt="${escapeHtmlAttr(coverAlt)}" style="max-width: 100%; border-radius: 12px; margin: 20px 0;">`;
      content += textToArticleHtml(contentText);
      inlineImages.forEach((img, i) => {
        content += `<img src="image${i + 1}.${extOf(img.name)}" alt="" style="max-width: 100%; border-radius: 12px; margin: 20px 0;">`;
      });
      content += CTA_HTML;

      const existingData = await site.getJson(`articles/${slug}/data.json`);
      await site.putJson(`articles/${slug}/data.json`, { title, date: todayStr(), tag, excerpt, content }, `Публикация статьи: ${title}`, existingData ? existingData.sha : undefined);

      const manifestRes = await site.getJson('articles/manifest.json');
      const manifest = (manifestRes ? manifestRes.json : []).filter((a) => a.slug !== slug);
      manifest.unshift({ slug, title, date: todayStr(), tag, excerpt });
      await site.putJson('articles/manifest.json', manifest, `Добавление статьи в manifest: ${title}`, manifestRes ? manifestRes.sha : undefined);

      const ogImageFile = cover ? `cover.${extOf(cover.name)}` : (inlineImages[0] ? `image1.${extOf(inlineImages[0].name)}` : null);
      const pageHtml = buildArticlePageHtml({ slug, title, excerpt, ogImageFile });
      await site.putText(`articles/${slug}/index.html`, pageHtml, `Страница статьи (мета-теги): ${title}`);

      post.siteTransfer = {
        status: 'published', title, slug, excerpt, tag, contentText, coverAlt,
        publishedAt: nowIso(), articleUrl: `https://zhivoy-ai.ru/articles/${slug}/`,
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

  /* ===================== Полноэкранный редактор текста ===================== */
  let fullscreenTargetId = null;
  function openFullscreenEditor(targetId, title) {
    fullscreenTargetId = targetId;
    $('#fullscreen-editor-title').textContent = title || 'Текст';
    $('#fullscreen-editor-textarea').value = $('#' + targetId).value;
    $('#fullscreen-editor').hidden = false;
    $('#fullscreen-editor-textarea').focus();
  }
  function closeFullscreenEditor() {
    if (fullscreenTargetId) {
      $('#' + fullscreenTargetId).value = $('#fullscreen-editor-textarea').value;
      if (fullscreenTargetId === 'editor-text') updateEditorPreview();
    }
    $('#fullscreen-editor').hidden = true;
    fullscreenTargetId = null;
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
    $('#btn-vk-subs-save').addEventListener('click', saveVkSubscribersManually);
    $('#btn-tg-baseline-save').addEventListener('click', () => saveBaseline('tg', '#tg-baseline-input'));
    $('#btn-vk-baseline-save').addEventListener('click', () => saveBaseline('vk', '#vk-baseline-input'));
    $('#backfill-date').max = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    $('#btn-backfill-save').addEventListener('click', saveBackdatedEntry);

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

    $('#editor-text').addEventListener('input', updateEditorPreview);
    $('#editor-cover-drop').addEventListener('click', () => $('#editor-cover-input').click());
    $('#editor-cover-input').addEventListener('change', (e) => { handleImageUpload(e.target.files[0], 'cover'); e.target.value = ''; });
    $('#editor-inline-drop').addEventListener('click', () => $('#editor-inline-input').click());
    $('#editor-inline-input').addEventListener('change', (e) => { handleImageUpload(e.target.files[0], 'inline'); e.target.value = ''; });

    $('#btn-editor-save').addEventListener('click', saveEditorPost);
    $('#btn-publish-tg').addEventListener('click', () => copyPostText('Telegram'));
    $('#btn-publish-vk').addEventListener('click', () => copyPostText('ВК'));
    $('#btn-copy-vc').addEventListener('click', () => copyPostText('vc.ru'));
    $('#btn-site-prepare').addEventListener('click', prepareSiteRewrite);
    $('#btn-site-publish').addEventListener('click', publishToSite);

    $all('.btn-fullscreen').forEach((b) => b.addEventListener('click', () => openFullscreenEditor(b.dataset.target, b.dataset.title)));
    $('#fullscreen-editor-done').addEventListener('click', closeFullscreenEditor);

    $all('.fmt-btn').forEach((b) => b.addEventListener('click', () => {
      const toolbar = b.closest('.format-toolbar');
      applyFormat(toolbar.dataset.target, b.dataset.fmt);
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    gateInit();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW register failed', e));
    }
  });
})();
