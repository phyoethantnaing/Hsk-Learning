// Small prebuilt index for the client-side search page (only words with content).
import { WORDS, levelSlug } from '../lib/words.mjs';
import { LEVELS } from '../lib/levels.mjs';
import { normalizeForSearch } from '../lib/pinyin.mjs';

export function GET() {
  const label = Object.fromEntries(LEVELS.map((l) => [l.key, l.label]));
  const entries = WORDS.map((w) => ({
    id: w.id,
    l: levelSlug(w),
    ll: label[String(w.level)],
    s: w.simplified,
    t: w.traditional,
    p: w.pinyin,
    n: w.pinyinNumbered.replace(/[\s/]/g, ''), // "ai4", "ba4ba5"
    k: normalizeForSearch(w.pinyin), // "ai", "baba"
    m: w.myanmar.meaning,
    e: w.english,
  }));
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
}
