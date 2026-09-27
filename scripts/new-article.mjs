#!/usr/bin/env node
// Доводит новую статью до публикации: страница index.html, запись в manifest.json и sitemap.xml.
//
//   node scripts/new-article.mjs <slug> [<slug> ...]   — подготовить статьи
//   node scripts/new-article.mjs <slug> --force        — перезаписать уже существующий index.html
//
// Перед запуском в articles/<slug>/ должны лежать data.json и все картинки/видео статьи.
// Скрипт ничего не удаляет и не трогает чужие статьи. Уже существующую страницу
// без --force не перезаписывает (статью могло перенести приложение «Контроль»).

import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, TAGS, REQUIRED_FIELDS, loadArticlePageBuilder, readJson, writeJson,
  articleDir, localMediaSrcs, pickOgImage, readSitemap, articleUrl,
} from './lib/site.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const slugs = args.filter((a) => !a.startsWith('--'));
if (!slugs.length) {
  console.error('Укажите slug статьи: node scripts/new-article.mjs <slug>');
  process.exit(1);
}

const buildArticlePageHtml = loadArticlePageBuilder();
const manifestPath = path.join(ROOT, 'articles', 'manifest.json');
const manifest = readJson(manifestPath);
let sitemap = readSitemap();
let failed = false;

for (const slug of slugs) {
  const problems = [];
  const dir = articleDir(slug);
  if (!/^[a-z0-9-]+$/.test(slug)) problems.push('slug должен быть латиницей, цифрами и дефисами');
  if (!fs.existsSync(path.join(dir, 'data.json'))) {
    console.error(`✗ ${slug}: нет файла articles/${slug}/data.json`);
    failed = true;
    continue;
  }

  let data;
  try {
    data = readJson(path.join(dir, 'data.json'));
  } catch (e) {
    console.error(`✗ ${slug}: data.json не читается как JSON — ${e.message}`);
    failed = true;
    continue;
  }
  for (const f of REQUIRED_FIELDS) if (!String(data[f] || '').trim()) problems.push(`в data.json пустое поле "${f}"`);
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) problems.push('дата должна быть в виде ГГГГ-ММ-ДД');
  if (data.tag && !TAGS.includes(data.tag)) problems.push(`рубрика "${data.tag}" не из списка: ${TAGS.join(', ')}`);
  for (const src of localMediaSrcs(data.content || '')) {
    if (src.includes('/')) problems.push(`путь к файлу "${src}" — должно быть просто имя файла, лежащего рядом`);
    else if (!fs.existsSync(path.join(dir, src))) problems.push(`нет файла "${src}", на который ссылается статья`);
  }
  if (problems.length) {
    console.error(`✗ ${slug}:\n  - ${problems.join('\n  - ')}`);
    failed = true;
    continue;
  }

  const ogImageFile = pickOgImage(slug, data.content);
  const done = [];

  const pagePath = path.join(dir, 'index.html');
  if (fs.existsSync(pagePath) && !force) {
    done.push('index.html уже был — не трогал (перезаписать: --force)');
  } else {
    fs.writeFileSync(pagePath, buildArticlePageHtml({ slug, title: data.title, excerpt: data.excerpt, ogImageFile }));
    done.push('index.html создан');
  }

  const entry = { slug, title: data.title, date: data.date, tag: data.tag, excerpt: data.excerpt, image: ogImageFile || '' };
  const idx = manifest.findIndex((a) => a.slug === slug);
  if (idx >= 0) {
    manifest[idx] = entry;
    done.push('запись в manifest.json обновлена');
  } else {
    // Новые сверху: ставим перед первой статьёй, которая старше этой.
    const at = manifest.findIndex((a) => a.date < entry.date);
    manifest.splice(at < 0 ? manifest.length : at, 0, entry);
    done.push('добавлена в manifest.json');
  }

  const url = articleUrl(slug);
  if (sitemap.includes(`<loc>${url}</loc>`)) {
    done.push('в sitemap.xml уже есть');
  } else {
    const block = `<url>\n<loc>${url}</loc>\n<lastmod>${data.date}</lastmod>\n<changefreq>monthly</changefreq>\n<priority>0.7</priority>\n</url>\n\n`;
    sitemap = sitemap.replace('</urlset>', block + '</urlset>');
    done.push('добавлена в sitemap.xml');
  }

  console.log(`✓ ${slug} (${data.date}): ${done.join('; ')}`);
}

writeJson(manifestPath, manifest);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

if (failed) {
  console.error('\nЕсть ошибки — исправьте и запустите ещё раз. Остальные статьи обработаны.');
  process.exit(1);
}
console.log('\nДальше: node scripts/check-site.mjs');
