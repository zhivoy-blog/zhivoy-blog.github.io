#!/usr/bin/env node
// Проверка статей сайта: всё ли на месте после публикации.
//
//   node scripts/check-site.mjs
//
// Проверяет каждую статью из articles/manifest.json и каждую папку в articles/:
// есть ли data.json со всеми полями, страница index.html с правильным адресом,
// все картинки/видео, обложка, запись в sitemap.xml, совпадают ли даты,
// нет ли дублей. Ошибки (✗) ломают сайт, предупреждения (⚠) — нет.

import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, TAGS, REQUIRED_FIELDS, readJson, articleDir, localMediaSrcs, readSitemap, articleUrl,
} from './lib/site.mjs';

const errors = [];
const warnings = [];
const err = (slug, msg) => errors.push(`✗ ${slug}: ${msg}`);
const warn = (slug, msg) => warnings.push(`⚠ ${slug}: ${msg}`);

const manifest = readJson(path.join(ROOT, 'articles', 'manifest.json'));
const sitemap = readSitemap();
const seen = new Set();
const texts = []; // для поиска повторов: слова каждой статьи

for (const entry of manifest) {
  const { slug } = entry;
  if (seen.has(slug)) err(slug, 'дважды записана в manifest.json');
  seen.add(slug);

  const dir = articleDir(slug);
  if (!fs.existsSync(dir)) { err(slug, 'есть в manifest.json, но нет папки articles/' + slug); continue; }

  const dataPath = path.join(dir, 'data.json');
  let data = null;
  if (!fs.existsSync(dataPath)) err(slug, 'нет data.json');
  else {
    try { data = readJson(dataPath); } catch (e) { err(slug, 'data.json не читается: ' + e.message); }
  }
  if (data) {
    for (const f of REQUIRED_FIELDS) if (!String(data[f] || '').trim()) err(slug, `в data.json пустое поле "${f}"`);
    if (data.date !== entry.date) warn(slug, `дата в data.json (${data.date}) и в manifest.json (${entry.date}) разные`);
    texts.push({ slug, title: String(data.title || '').trim().toLowerCase(), words: wordSet(data.content || '') });
    for (const src of localMediaSrcs(data.content || '')) {
      if (!fs.existsSync(path.join(dir, src))) err(slug, `нет файла "${src}", на который ссылается статья`);
    }
  }

  const pagePath = path.join(dir, 'index.html');
  if (!fs.existsSync(pagePath)) err(slug, 'нет index.html — ссылка на статью отдаёт 404');
  else {
    const page = fs.readFileSync(pagePath, 'utf8');
    if (!page.includes(`<link rel="canonical" href="${articleUrl(slug)}">`)) {
      err(slug, 'в index.html адрес (canonical) от другой статьи — страницу скопировали и не поправили');
    }
  }

  if (!TAGS.includes(entry.tag)) warn(slug, `рубрика "${entry.tag}" не из фильтров главной (${TAGS.join(', ')})`);
  if (!entry.image) warn(slug, 'нет картинки-превью (image в manifest.json)');
  else if (!fs.existsSync(path.join(dir, entry.image))) err(slug, `нет картинки-превью "${entry.image}"`);
  else {
    const kb = fs.statSync(path.join(dir, entry.image)).size / 1024;
    if (kb > 400) warn(slug, `обложка весит ${Math.round(kb)} КБ — лучше сжать до 300 КБ`);
  }

  if (!sitemap.includes(`<loc>${articleUrl(slug)}</loc>`)) err(slug, 'нет в sitemap.xml — поисковики её не увидят');
}

for (const name of fs.readdirSync(path.join(ROOT, 'articles'))) {
  const full = path.join(ROOT, 'articles', name);
  if (!fs.statSync(full).isDirectory() || seen.has(name)) continue;
  // Удалённая статья: в папке остался только index.html, который отправляет на другую статью.
  const target = redirectTarget(path.join(full, 'index.html'));
  if (target && !fs.existsSync(path.join(full, 'data.json'))) {
    if (!seen.has(target)) err(name, `переадресация ведёт на "${target}", а такой статьи нет в manifest.json`);
    continue;
  }
  warn(name, 'папка есть, но статьи нет в manifest.json — на главной её не видно');
}

// Повторы: одинаковый заголовок или почти тот же текст (общих слов не меньше DUP_LIMIT).
// У разных статей сайта, даже частей одной серии, общих слов не больше ~0,11.
const DUP_LIMIT = 0.2;
for (let i = 0; i < texts.length; i++) {
  for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    let common = 0;
    for (const w of a.words) if (b.words.has(w)) common++;
    const share = common / (a.words.size + b.words.size - common || 1);
    if (a.title === b.title) err(b.slug, `тот же заголовок, что у "${a.slug}" — повтор статьи`);
    else if (share >= DUP_LIMIT) {
      err(b.slug, `текст почти как у "${a.slug}" (общих слов ${Math.round(share * 100)}%) — повтор статьи, одну из них удалить`);
    }
  }
}

const locRe = /<loc>https:\/\/zhivoy-ai\.ru\/articles\/([^/<]+)\/<\/loc>/g;
let m;
while ((m = locRe.exec(sitemap))) {
  if (!seen.has(m[1])) warn(m[1], 'есть в sitemap.xml, но нет в manifest.json');
}

console.log(`Статей в manifest.json: ${manifest.length}`);
if (errors.length) console.log('\n' + errors.join('\n'));
if (warnings.length) console.log('\n' + warnings.join('\n'));
if (!errors.length && !warnings.length) console.log('Всё в порядке.');
console.log(`\nИтого: ошибок ${errors.length}, предупреждений ${warnings.length}`);
process.exit(errors.length ? 1 : 0);

function wordSet(html) {
  return new Set(html.replace(/<[^>]+>/g, ' ').toLowerCase().split(/[^а-яёa-z0-9]+/).filter(w => w.length > 3));
}

function redirectTarget(pagePath) {
  if (!fs.existsSync(pagePath)) return null;
  const m = /location\.replace\('\.\.\/([^/']+)\/'\)/.exec(fs.readFileSync(pagePath, 'utf8'));
  return m ? m[1] : null;
}
