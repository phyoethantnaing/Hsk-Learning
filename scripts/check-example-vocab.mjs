#!/usr/bin/env node
// Flags example-sentence words that are above the level of the word they belong to.
// An HSK 1 learner must be able to read every word in an HSK 1 example.
//
//   node scripts/check-example-vocab.mjs           # all levels
//   node scripts/check-example-vocab.mjs 1         # only HSK 1
//
// How it works: each sentence is split into HSK words. Of all possible splits,
// the one with the fewest too-high/unknown words wins (then the fewest words),
// so "大学生活" is read as 大学 + 生活 rather than 大学生 + 活.
// Proper names and other agreed exceptions go in data/example-vocab-allowlist.json.
// Exits with code 1 if anything is flagged.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];
const rank = (level) => LEVELS.indexOf(String(level)) + 1; // "7-9" -> 7

// Lowest level at which each word appears.
const dict = new Map();
for (const level of LEVELS) {
  for (const r of JSON.parse(readFileSync(join(ROOT, 'data/raw', `hsk${level}.json`), 'utf8'))) {
    if (!dict.has(r.simplified)) dict.set(r.simplified, rank(level));
  }
}
const allowPath = join(ROOT, 'data/example-vocab-allowlist.json');
const allow = new Set(existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')).words : []);
const MAX_LEN = Math.max(...[...dict.keys(), ...allow].map((w) => w.length));

/** Split a run of Chinese characters into words, preferring words at or below `max` rank. */
function segment(text, max) {
  const n = text.length;
  // best[i] = [badCount, wordCount, words] for text.slice(i)
  const best = new Array(n + 1);
  best[n] = [0, 0, []];
  for (let i = n - 1; i >= 0; i--) {
    let choice = null;
    for (let len = 1; len <= Math.min(MAX_LEN, n - i); len++) {
      const word = text.slice(i, i + len);
      const level = allow.has(word) ? 0 : dict.get(word);
      if (level === undefined && len > 1) continue; // unknown multi-char strings are not words
      const bad = level === undefined || level > max ? 1 : 0;
      const [restBad, restCount, restWords] = best[i + len];
      const cand = [bad + restBad, 1 + restCount, [{ word, level, bad: !!bad }, ...restWords]];
      if (!choice || cand[0] < choice[0] || (cand[0] === choice[0] && cand[1] < choice[1])) choice = cand;
    }
    best[i] = choice;
  }
  // Join neighbouring unknown characters back together: 缅 + 甸 -> 缅甸.
  const out = [];
  for (const t of best[0][2]) {
    const prev = out.at(-1);
    if (prev && prev.level === undefined && t.level === undefined) prev.word += t.word;
    else out.push({ ...t });
  }
  return out;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.json') ? [p] : [];
  });
}

const only = process.argv[2];
let checked = 0;
const flagged = [];
for (const file of walk(join(ROOT, 'data/words')).sort()) {
  for (const w of JSON.parse(readFileSync(file, 'utf8'))) {
    if (only && String(w.level) !== only) continue;
    const max = rank(w.level);
    (w.examples ?? []).forEach((ex, n) => {
      checked++;
      const runs = ex.zh.match(/\p{Script=Han}+/gu) ?? [];
      const bad = runs.flatMap((run) => segment(run, max)).filter((t) => t.bad);
      if (bad.length) {
        const list = bad.map((t) => `${t.word} (${t.level ? `HSK ${LEVELS[t.level - 1]}` : 'not in any HSK list'})`);
        flagged.push(`${relative(ROOT, file)} ${w.id} ${w.simplified} examples[${n}] "${ex.zh}"\n      ${list.join(', ')}`);
      }
    });
  }
}

console.log(`Checked ${checked} example sentence(s).`);
if (flagged.length) {
  console.log(`\n${flagged.length} sentence(s) use words above their level:`);
  for (const f of flagged) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Every example only uses words at or below its level.');
