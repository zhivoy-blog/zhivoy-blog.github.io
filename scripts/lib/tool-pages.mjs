// Отдельные страницы для самых популярных инструментов (свой адрес = свой поисковый запрос).
//
// Каждая страница — копия tools.html со своими title, description, H1, вступлением
// и пояснением «как пользоваться» + частые вопросы. Нужный инструмент открыт сразу,
// остальные инструменты тоже на месте. Код инструментов живёт только в tools.html:
// после его правки страницы пересобирает `node scripts/build-tool-pages.mjs`,
// а check-site.mjs ругается, если забыли.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE_URL } from './site.mjs';

export const TOOL_PAGES = [
  {
    file: 'szhat-foto.html',
    name: 'Сжать фото',
    tab: 'compress',
    cat: 'images',
    title: 'Сжать фото онлайн бесплатно, без потери качества — Живой ИИ',
    description: 'Уменьшить вес фото JPG, PNG, HEIC прямо в браузере: можно сразу несколько, результат одним архивом. Бесплатно, фото никуда не отправляется.',
    h1: 'Сжать фото онлайн — бесплатно и без отправки на сервер',
    lead: 'Фото не уходит по почте или не загружается на Госуслуги, потому что «файл слишком большой»? Здесь его можно уменьшить в несколько раз за пару секунд. Всё происходит в вашем телефоне или компьютере: фото никуда не загружается.',
    steps: [
      'Нажмите на поле с фотоаппаратом и выберите одно или сразу несколько фото.',
      'Выберите качество. «Среднее» подходит почти всегда: файл станет в разы легче, а на глаз разницы почти нет.',
      'Нажмите «Скачать результат». Если фото несколько — «Скачать всё в ZIP» (ZIP — это архив: один файл, внутри которого все фото).',
    ],
    faq: [
      ['Фото станет хуже?', 'На «Среднем» качестве разницу обычно не видно. Проверьте сами: кнопки «Оригинал» и «Сжатое» показывают фото до и после.'],
      ['Подойдут фото с iPhone (HEIC)?', 'Да. Такие фото открываются здесь же, а на выходе получается обычный JPEG, который откроется где угодно.'],
      ['Куда попадает моё фото?', 'Никуда. Сжатие идёт прямо в браузере, на сервер ничего не отправляется. Закрыли вкладку — ничего не осталось.'],
      ['Сколько это стоит?', 'Бесплатно и без регистрации.'],
    ],
  },
  {
    file: 'video-v-mp3.html',
    name: 'Видео в MP3',
    tab: 'tomp3',
    cat: 'audio',
    title: 'Видео в MP3 онлайн бесплатно — звук из видео — Живой ИИ',
    description: 'Вытащить звук из видео или превратить голосовое из Telegram и WhatsApp в MP3 прямо в браузере. Бесплатно, без регистрации, файл никуда не отправляется.',
    h1: 'Видео в MP3: достать звук из видео или голосового',
    lead: 'Понравилась песня из ролика, нужно сохранить запись лекции или голосовое сообщение не открывается на компьютере? Выберите файл — и получите обычный MP3, который играет на любом телефоне, компьютере и в машине.',
    steps: [
      'Нажмите на поле с наушниками и выберите видео с телефона или голосовое сообщение (файлы .ogg, .opus).',
      'Выберите качество: «Обычное» — для голоса, «Хорошее» — для музыки.',
      'Нажмите «Сделать MP3», послушайте результат и скачайте.',
    ],
    faq: [
      ['Почему в первый раз долго?', 'Браузер один раз скачивает модуль обработки (около 30 МБ) — лучше сделать это по Wi-Fi. Дальше всё работает быстро.'],
      ['Какие файлы подходят?', 'Видео MP4, MOV, WEBM, MKV, AVI, 3GP и аудио OGG, OPUS, M4A, WAV, FLAC, AMR, WMA.'],
      ['Видео куда-то загружается?', 'Нет. Звук достаётся прямо в браузере, файл не покидает ваше устройство.'],
      ['А длинное видео?', 'Можно, но на телефоне обработка длинного видео может занять несколько минут — не закрывайте вкладку.'],
    ],
  },
  {
    file: 'obedinit-pdf.html',
    name: 'Объединить PDF',
    tab: 'pmerge',
    cat: 'pdf',
    title: 'Объединить PDF в один файл онлайн бесплатно — Живой ИИ',
    description: 'Склеить несколько PDF в один файл прямо в браузере: сканы документов, страницы договора, справки. Бесплатно, файлы никуда не отправляются.',
    h1: 'Объединить PDF в один файл — бесплатно, прямо в браузере',
    lead: 'Нужно отправить договор, справки или сканы паспорта одним вложением? Выберите несколько PDF — и получите один общий файл. Документы не загружаются ни на какой сайт: для личных бумаг это важно.',
    steps: [
      'Нажмите на поле со стопкой книг и выберите PDF-файлы — можно сразу несколько.',
      'Расставьте их по порядку стрелками.',
      'Нажмите «Объединить», а потом «Скачать PDF».',
    ],
    faq: [
      ['У меня только фото документов, не PDF.', 'Сначала превратите фото в PDF: «Картинки» → «Формат» → PDF. Потом объедините.'],
      ['Как убрать лишнюю страницу?', 'В этом же разделе есть инструмент <a href="#ppages">«Страницы PDF»</a>: он вырезает или удаляет нужные страницы.'],
      ['Это безопасно для паспорта и договоров?', 'Да. Файлы склеиваются прямо в браузере и не покидают ваше устройство.'],
    ],
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GUIDE_RE = /(<!-- guide:start[^>]*-->)[\s\S]*?(<!-- guide:end -->)/;

function guideHtml(page) {
  const others = TOOL_PAGES.filter((p) => p !== page)
    .map((p) => `<li><a href="${p.file}">${esc(p.name)}</a></li>`).join('\n');
  return `<div class="card tool-guide">
<h2>Как пользоваться</h2>
<ol>
${page.steps.map((s) => `<li>${esc(s)}</li>`).join('\n')}
</ol>
<h2>Частые вопросы</h2>
${page.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${a}</p>`).join('\n')}
<h2>Другие инструменты</h2>
<ul>
${others}
<li><a href="tools.html">Все бесплатные инструменты</a> — фото, видео, звук, PDF и текст</li>
</ul>
</div>`;
}

function jsonLd(page) {
  const url = `${SITE_URL}/${page.file}`;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: page.h1,
      description: page.description,
      url,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Любой браузер',
      inLanguage: 'ru',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') },
      })),
    },
  ];
  return '<script type="application/ld+json">\n' + JSON.stringify(data, null, 2).replace(/</g, '\\u003c') + '\n</script>';
}

// Собирает HTML отдельной страницы из текущего tools.html.
export function buildToolPage(toolsHtml, page) {
  const url = `${SITE_URL}/${page.file}`;
  let html = toolsHtml;
  const swap = (re, to) => {
    if (!re.test(html)) throw new Error(`${page.file}: в tools.html не нашёл ${re}`);
    html = html.replace(re, to);
  };
  swap(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`);
  swap(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(page.description)}">`);
  swap(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(page.title)}">`);
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(page.description)}">`);
  swap(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">\n${jsonLd(page)}`);
  swap(/<div class="page-wrap" id="page-wrap" data-cat="images">/,
    `<div class="page-wrap" id="page-wrap" data-cat="images" data-default-tab="${page.tab}">`);
  swap(/<h1 class="page-title">[^<]*<\/h1>/,
    `<h1 class="page-title">${esc(page.h1)}</h1>\n<p class="page-intro">${esc(page.lead)}</p>`);
  swap(GUIDE_RE, `$1\n${guideHtml(page)}\n$2`);
  swap(/^<!DOCTYPE html>\n/, '<!DOCTYPE html>\n<!-- Страница собрана из tools.html скриптом scripts/build-tool-pages.mjs — руками не править. -->\n');
  return html;
}

export function readToolsHtml() {
  return fs.readFileSync(path.join(ROOT, 'tools.html'), 'utf8');
}

export function toolPagePath(page) {
  return path.join(ROOT, page.file);
}
