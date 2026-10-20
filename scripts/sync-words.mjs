#!/usr/bin/env node
// Fills in the fields of every word in data/words/ that come from the official
// list or are generated, so authors only write the learning content.
//
//   node scripts/sync-words.mjs
//
// From data/raw (by id): level, simplified, traditional, pinyin, english, needsReview.
// Generated from pinyin: pinyinNumbered, tones.
// Defaults when missing: relatedWords [], audio { word: null }, examples[].audio null,
// workbookRefs [], reviewStatus "draft".
// Keys are written in a fixed order so diffs stay small. Run `npm run validate` after.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toNumbered, tones } from '../src/lib/pinyin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];

const raw = new Map();
for (const level of LEVELS) {
  for (const r of JSON.parse(readFileSync(join(ROOT, 'data/raw', `hsk${level}.json`), 'utf8'))) raw.set(r.id, r);
}

const ORDER = [
  'id', 'level', 'simplified', 'traditional', 'pinyin', 'pinyinNumbered', 'tones', 'english',
  'partOfSpeech', 'myanmar', 'examples', 'relatedWords', 'audio', 'workbookRefs',
  'reviewStatus', 'needsReview', 'reviewNote',
];
const MYANMAR_ORDER = ['meaning', 'kidExplanation', 'pronunciationTip', 'memoryTip', 'usageNote', 'commonMistake'];

function ordered(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k]; // unknown keys: validate will report them
  return out;
}

function sync(word) {
  const r = raw.get(word.id);
  if (!r) throw new Error(`${word.id} is not in data/raw`);
  const w = {
    ...word,
    level: r.level,
    simplified: r.simplified,
    traditional: r.traditional,
    pinyin: r.pinyin,
    pinyinNumbered: toNumbered(r.pinyin),
    tones: tones(r.pinyin),
    english: r.english,
    relatedWords: word.relatedWords ?? [],
    audio: word.audio ?? { word: null },
    workbookRefs: word.workbookRefs ?? [],
    reviewStatus: word.reviewStatus ?? 'draft',
  };
  if (r.needsReview && w.needsReview === undefined && w.reviewStatus === 'draft') w.needsReview = true;
  if (w.myanmar) w.myanmar = ordered(w.myanmar, MYANMAR_ORDER);
  if (w.examples) w.examples = w.examples.map((ex) => ordered({ ...ex, audio: ex.audio ?? null }, ['zh', 'pinyin', 'my', 'audio']));
  return ordered(w, ORDER);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.json') ? [p] : [];
  });
}

let changed = 0;
for (const file of walk(join(ROOT, 'data/words')).sort()) {
  const before = readFileSync(file, 'utf8');
  const words = JSON.parse(before).map(sync);
  const after = `${JSON.stringify(words, null, 2)}\n`;
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
    console.log(`updated ${relative(ROOT, file)}`);
  }
}
console.log(changed ? `${changed} file(s) updated.` : 'All word files already in sync.');
