// Общие помощники для скриптов сайта.
//
// Шаблон страницы статьи НЕ дублируется здесь: он берётся прямо из приложения
// «Живой ИИ: Контроль» (shtab-d14558/app.js, функция buildArticlePageHtml).
// Так страницы, созданные вручную и через приложение, всегда одинаковые.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITE_URL = 'https://zhivoy-ai.ru';
// Рубрики = кнопки-фильтры на главной (index.html, .tag-filter). Другая рубрика не попадёт ни в один фильтр.
export const TAGS = ['музыка', 'промпты', 'тексты', 'реальные-истории'];
export const REQUIRED_FIELDS = ['title', 'date', 'tag', 'excerpt', 'content'];

const GEN_START = '/* ===================== Генератор статической страницы статьи';
const GEN_END = "const LS_SETTINGS = ";

export function loadArticlePageBuilder() {
  const src = fs.readFileSync(path.join(ROOT, 'shtab-d14558', 'app.js'), 'utf8');
  const a = src.indexOf(GEN_START);
  const b = src.indexOf(GEN_END, a);
  if (a < 0 || b < 0) {
    throw new Error('Не нашёл генератор страницы в shtab-d14558/app.js — его переименовали или перенесли?');
  }
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(a, b) + '\nreturn buildArticlePageHtml;')();
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function articleDir(slug) {
  return path.join(ROOT, 'articles', slug);
}

// Все src="..." из HTML статьи, кроме внешних ссылок и data:-картинок.
export function localMediaSrcs(html) {
  const out = [];
  const re = /\ssrc=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (/^(https?:|data:|\/\/)/i.test(src)) continue;
    out.push(decodeURIComponent(src.replace(/^\.\//, '').split(/[?#]/)[0]));
  }
  return out;
}

// Обложка для соцсетей и превью на главной: cover.* в папке, иначе первая картинка статьи.
export function pickOgImage(slug, content) {
  const dir = articleDir(slug);
  const cover = fs.readdirSync(dir).find((f) => /^cover\.(jpe?g|png|webp)$/i.test(f));
  if (cover) return cover;
  const firstImg = /<img[^>]+src=["']([^"']+)["']/i.exec(content || '');
  if (firstImg && !/^(https?:|data:|\/\/)/i.test(firstImg[1])) {
    return decodeURIComponent(firstImg[1].replace(/^\.\//, ''));
  }
  return null;
}

export function readSitemap() {
  return fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
}

export function articleUrl(slug) {
  return `${SITE_URL}/articles/${slug}/`;
}
