#!/usr/bin/env node
// Считает знаки в посте и сверяет с лимитами площадок. Считать «на глаз» нельзя.
//
//   node scripts/count-chars.mjs post.txt
//   cat post.txt | node scripts/count-chars.mjs
//
// Знаки считаются как в Telegram: с пробелами, эмодзи — по символам.
// Лимиты: подпись к фото в Telegram — 1024 (с Premium — 2048),
// обычное сообщение в Telegram — 4096, цель канала для поста с картинкой — 1000–1100.

import fs from 'node:fs';

const HASHTAGS = ['#живойии', '#промтдня', '#ии_лайфхак'];

const file = process.argv[2];
const text = (file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8')).trim();

// Символы как их видит человек (эмодзи с модификаторами — один символ).
const seg = new Intl.Segmenter('ru', { granularity: 'grapheme' });
const chars = [...seg.segment(text)].length;
const noSpaces = [...seg.segment(text.replace(/\s/g, ''))].length;
// Telegram считает лимит в UTF-16: эмодзи там «весят» 2 знака и больше.
const tgUnits = text.length;

const lines = [
  `Знаков с пробелами: ${chars}`,
  `Знаков без пробелов: ${noSpaces}`,
  `Как считает Telegram: ${tgUnits}`,
  '',
  `Подпись к фото, обычный аккаунт (1024): ${tgUnits <= 1024 ? '✓ влезает' : `✗ больше на ${tgUnits - 1024}`}`,
  `Подпись к фото, Telegram Premium (2048): ${tgUnits <= 2048 ? '✓ влезает' : `✗ больше на ${tgUnits - 2048}`}`,
  `Цель канала 1000–1100: ${tgUnits < 1000 ? 'короче цели' : tgUnits <= 1100 ? '✓ в цели' : `✗ больше на ${tgUnits - 1100}`}`,
  `Сообщение без картинки (4096): ${tgUnits <= 4096 ? '✓ влезает' : `✗ больше на ${tgUnits - 4096}`}`,
];

const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
if (tags.length) {
  const extra = tags.filter((t) => !HASHTAGS.includes(t.toLowerCase()));
  const missing = HASHTAGS.filter((t) => !tags.map((x) => x.toLowerCase()).includes(t));
  lines.push('', `Хэштеги: ${tags.join(' ')}`);
  if (extra.length) lines.push(`✗ лишние хэштеги: ${extra.join(' ')}`);
  if (missing.length) lines.push(`✗ не хватает: ${missing.join(' ')}`);
  if (!extra.length && !missing.length) lines.push('✓ ровно три нужных хэштега');
}

const dashes = (text.match(/ — /g) || []).length;
const sentences = (text.match(/[.!?…](\s|$)/g) || []).length || 1;
if (dashes > sentences / 3) lines.push('', `⚠ тире: ${dashes} на ${sentences} предложений — многовато, часть замените точкой или запятой`);
if (/прикинь/i.test(text)) lines.push('', '✗ слово «прикинь» — убрано из словаря Вадима');

console.log(lines.join('\n'));
