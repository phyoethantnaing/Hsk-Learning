#!/usr/bin/env node
// Validates every word batch in data/words/ against the schema and the raw
// official list. Exits with code 1 if anything is wrong.
//
//   node scripts/validate-data.mjs
//
// Checks:
//  - JSON Schema (data/schema/word.schema.json): required fields, types, ≥2 examples
//  - file names match their contents (data/words/hsk1/hsk1-001-050.json holds #1–#50)
//  - id, level, simplified, traditional, pinyin, english match data/raw exactly
//  - pinyinNumbered and tones match what the pinyin says
//  - Myanmar text is Unicode, not Zawgyi (also checks the site's own UI text in src/)
//  - example pinyin is real pinyin with one syllable per Chinese character
//  - data/example-vocab-allowlist.json entries are well formed
//  - pronunciationTip follows docs/content-guide.md (quoted hint, no tone
//    descriptions or disclaimer, agreed Myanmar spellings)
//  - warns when a file's first-person examples are not roughly half ကျွန်မ

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import { toNumbered, tones, syllables } from '../src/lib/pinyin.mjs';
import { zawgyiProblems } from './lib/zawgyi.mjs';
import { ALLOWLIST } from '../src/lib/allowlist.mjs';
import { TONES } from '../src/lib/tones.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

function walk(dir, exts) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, exts);
    return exts.some((e) => name.endsWith(e)) ? [p] : [];
  });
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(relative(ROOT, path), `invalid JSON: ${e.message}`);
    return null;
  }
}

// --- raw official list -------------------------------------------------------
const raw = new Map();
for (const level of LEVELS) {
  const rows = readJson(join(ROOT, 'data/raw', `hsk${level}.json`)) ?? [];
  for (const r of rows) raw.set(r.id, r);
}

// --- schema ------------------------------------------------------------------
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateWord = ajv.compile(readJson(join(ROOT, 'data/schema/word.schema.json')));

const SENTENCE_PUNCTUATION = /[，。！？、：；“”‘’"«»….,!?:;—–]/g;

/** Explains why `pinyin` cannot be the reading of `zh`, or returns null if it fits. */
function pinyinMismatch(zh, pinyin) {
  let parts;
  try {
    parts = syllables(pinyin.replace(SENTENCE_PUNCTUATION, ' '));
  } catch (e) {
    return e.message;
  }
  const hanCount = (zh.match(/\p{Script=Han}/gu) ?? []).length;
  const expected = hanCount - parts.filter((p) => p.erhua).length;
  if (parts.length !== expected) {
    return `${parts.length} syllable(s) for ${hanCount} Chinese character(s) — a syllable is missing or extra`;
  }
  return null;
}

// --- allowlisted proper nouns ------------------------------------------------
for (const [i, entry] of ALLOWLIST.entries()) {
  const where = `data/example-vocab-allowlist.json words[${i}] ${entry.word ?? ''}`;
  const keys = Object.keys(entry).sort().join(',');
  if (keys !== 'my,pinyin,word') {
    err(where, 'each entry needs exactly "word", "pinyin" and "my"');
    continue;
  }
  if (!/^\p{Script=Han}+$/u.test(entry.word)) err(where, 'word must be Chinese characters');
  const problem = pinyinMismatch(entry.word, entry.pinyin);
  if (problem) err(where, `pinyin: ${problem}`);
  if (!/[\u1000-\u109F]/u.test(entry.my)) err(where, 'my must be Myanmar text');
  for (const p of zawgyiProblems(entry.my)) err(where, `my looks like Zawgyi (${p})`);
  if ([...raw.values()].some((r) => r.simplified === entry.word)) {
    err(where, `${entry.word} is an HSK word, so it does not belong in the allowlist`);
  }
}

// --- word batches ------------------------------------------------------------
const FILE_NAME = /^hsk([1-6]|7-9)-(\d{3,4})-(\d{3,4})\.json$/;
const seen = new Map();
const stats = Object.fromEntries(LEVELS.map((l) => [l, { words: 0, draft: 0, reviewed: 0 }]));
const needsReview = [];

for (const file of walk(join(ROOT, 'data/words'), ['.json']).sort()) {
  const rel = relative(ROOT, file);
  const words = readJson(file);
  if (words === null) continue;
  if (!Array.isArray(words)) {
    err(rel, 'a batch file must be a JSON array of words');
    continue;
  }

  const name = file.split('/').pop();
  const m = FILE_NAME.exec(name);
  const dirLevel = file.split('/').at(-2).replace(/^hsk/, '');
  if (!m) err(rel, 'file name must look like hsk1-001-050.json');
  else if (m[1] !== dirLevel) err(rel, `file is in folder hsk${dirLevel} but named for hsk${m[1]}`);

  let prevNumber = 0;
  const firstPerson = { male: 0, female: 0 };
  words.forEach((w, i) => {
    const where = `${rel} [${i}] ${w?.id ?? '(no id)'} ${w?.simplified ?? ''}`;
    if (!validateWord(w)) {
      for (const e of validateWord.errors) err(where, `${e.instancePath || '/'} ${e.message}`);
      return;
    }

    // Identity and file placement
    if (seen.has(w.id)) err(where, `duplicate id (also in ${seen.get(w.id)})`);
    seen.set(w.id, rel);
    const number = Number(w.id.split('-').at(-1));
    if (m && (number < Number(m[2]) || number > Number(m[3]))) {
      err(where, `#${number} does not belong in a file for #${Number(m[2])}–#${Number(m[3])}`);
    }
    if (number <= prevNumber) err(where, 'words must be in order of their number');
    prevNumber = number;
    if (String(w.level) !== dirLevel) err(where, `level ${w.level} is in folder hsk${dirLevel}`);

    // Must match the official list exactly
    const r = raw.get(w.id);
    if (!r) {
      err(where, 'id is not in data/raw');
      return;
    }
    for (const key of ['level', 'simplified', 'traditional', 'pinyin', 'english']) {
      if (w[key] !== r[key]) err(where, `${key} is ${JSON.stringify(w[key])} but the official list says ${JSON.stringify(r[key])}`);
    }

    // Generated pinyin fields
    const expectedNumbered = toNumbered(w.pinyin);
    if (w.pinyinNumbered !== expectedNumbered) err(where, `pinyinNumbered should be "${expectedNumbered}"`);
    if (!isDeepStrictEqual(w.tones, tones(w.pinyin))) err(where, `tones should be ${JSON.stringify(tones(w.pinyin))}`);

    // Myanmar text: Unicode only
    const myanmarTexts = [
      ...Object.entries(w.myanmar).map(([k, v]) => [`myanmar.${k}`, v]),
      ...w.examples.map((ex, n) => [`examples[${n}].my`, ex.my]),
    ];
    for (const [field, text] of myanmarTexts) {
      for (const p of zawgyiProblems(text)) err(where, `${field} looks like Zawgyi (${p})`);
    }

    // Pronunciation tip (docs/content-guide.md)
    const tip = w.myanmar.pronunciationTip;
    if (!/"[^"]*[\u1000-\u109F][^"]*"/u.test(tip)) {
      err(where, 'pronunciationTip needs the Myanmar sound hint in quotes, e.g. "ပေါ်-ဇ" လို့ ပြောပါ။');
    }
    for (const phrase of [...Object.values(TONES).map((t) => t.how), 'အကြမ်းဖျင်း', '🔊']) {
      if (tip.includes(phrase)) err(where, `pronunciationTip must not repeat "${phrase}" — the page shows tone chips and the reminder`);
    }
    for (const hint of tip.match(/"[^"]*"/g) ?? []) {
      if (/[တထဒန]ျ/u.test(hint)) err(where, `pronunciationTip hint ${hint}: write ian after d/t/n as ိယန် (e.g. "တိယန်"), not a ျ stack`);
      if (/ောင်/u.test(hint)) err(where, `pronunciationTip hint ${hint}: write ao as ော် (e.g. "ပေါ်"), not ောင်`);
    }
    for (const ex of w.examples) {
      if (ex.my.includes('ကျွန်တော်')) firstPerson.male++;
      if (ex.my.includes('ကျွန်မ')) firstPerson.female++;
    }

    // Examples
    w.examples.forEach((ex, n) => {
      const problem = pinyinMismatch(ex.zh, ex.pinyin);
      if (problem) err(where, `examples[${n}].pinyin: ${problem}`);
      if (!/\p{Script=Han}/u.test(ex.zh)) err(where, `examples[${n}].zh has no Chinese characters`);
      if (!ex.zh.includes(w.simplified)) warn(where, `examples[${n}] does not contain ${w.simplified}`);
    });

    if (r.needsReview && !w.needsReview && w.reviewStatus === 'draft') {
      err(where, 'the official list entry is flagged needsReview; keep "needsReview": true until it is checked');
    }
    if (w.needsReview) needsReview.push(`${w.id} ${w.simplified} ${w.pinyin}${w.reviewNote ? ` — ${w.reviewNote}` : ''}`);

    const s = stats[dirLevel];
    s.words++;
    s[w.reviewStatus]++;
  });

  const fp = firstPerson.male + firstPerson.female;
  if (fp >= 6 && (firstPerson.female / fp < 0.35 || firstPerson.female / fp > 0.65)) {
    warn(rel, `${firstPerson.female} of ${fp} first-person examples use ကျွန်မ; aim for about half`);
  }
}

for (const r of raw.values()) {
  if (r.needsReview && !seen.has(r.id)) needsReview.push(`${r.id} ${r.simplified} ${r.pinyin} (official list; no content yet)`);
}

// --- site UI text --------------------------------------------------------------
for (const file of walk(join(ROOT, 'src'), ['.astro', '.mjs', '.js', '.ts', '.json', '.md', '.css'])) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const p of zawgyiProblems(line)) err(`${relative(ROOT, file)}:${i + 1}`, `looks like Zawgyi (${p})`);
  });
}

// --- report ------------------------------------------------------------------
const rawCount = (l) => [...raw.values()].filter((r) => String(r.level) === l).length;
console.log('Level    Written / Total   draft  reviewed');
for (const l of LEVELS) {
  const s = stats[l];
  console.log(`hsk${l.padEnd(5)} ${String(s.words).padStart(7)} / ${String(rawCount(l)).padEnd(7)} ${String(s.draft).padStart(5)}  ${String(s.reviewed).padStart(8)}`);
}
if (needsReview.length) {
  console.log(`\nNeeds checking against the official syllabus (${needsReview.length}):`);
  for (const n of needsReview) console.log(`  ${n}`);
}
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\nAll word data is valid.');
