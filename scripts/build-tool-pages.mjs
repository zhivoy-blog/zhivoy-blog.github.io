#!/usr/bin/env node
// Пересобирает отдельные страницы популярных инструментов (szhat-foto.html и др.) из tools.html.
//
//   node scripts/build-tool-pages.mjs
//
// Запускать после любой правки tools.html. Тексты страниц — в scripts/lib/tool-pages.mjs.

import fs from 'node:fs';
import { TOOL_PAGES, buildToolPage, readToolsHtml, toolPagePath } from './lib/tool-pages.mjs';

const tools = readToolsHtml();
for (const page of TOOL_PAGES) {
  fs.writeFileSync(toolPagePath(page), buildToolPage(tools, page));
  console.log(`✓ ${page.file}`);
}
console.log('\nДальше: node scripts/check-site.mjs');
