#!/usr/bin/env node
// Записывает меню в шапке и подвал прямо в HTML страниц в корне сайта
// (главная, «О проекте», инструменты), чтобы поисковики видели ссылки без скриптов.
//
//   node scripts/build-chrome.mjs
//
// Разметка — из shtab-d14558/app.js (buildSiteMenuHtml, buildSiteFooterHtml), та же,
// что у страниц статей. Отдельные страницы инструментов после этого пересобираются из tools.html.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadArticlePageParts } from './lib/site.mjs';
import { TOOL_PAGES, buildToolPage, readToolsHtml, toolPagePath } from './lib/tool-pages.mjs';

export const CHROME_PAGES = ['index.html', 'about.html', 'tools.html'];

const { replaceSiteChrome } = loadArticlePageParts();

let failed = false;
for (const file of CHROME_PAGES) {
  const full = path.join(ROOT, file);
  const html = fs.readFileSync(full, 'utf8');
  const next = replaceSiteChrome(html, '');
  if (next === null) {
    console.log(`✗ ${file}: нет <header class="header"> или <footer class="site-footer">`);
    failed = true;
    continue;
  }
  if (next !== html) fs.writeFileSync(full, next);
  console.log(`✓ ${file}`);
}

const tools = readToolsHtml();
for (const page of TOOL_PAGES) {
  fs.writeFileSync(toolPagePath(page), buildToolPage(tools, page));
  console.log(`✓ ${page.file}`);
}

console.log('\nДальше: node scripts/check-site.mjs');
process.exit(failed ? 1 : 0);
