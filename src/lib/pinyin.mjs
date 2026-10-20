// Pinyin helpers shared by the data scripts and the site (search, tone colours).
//
//   toNumbered('bàba')        -> 'ba4 ba5'
//   syllables('dǎ diànhuà')   -> [{ text: 'dǎ', bare: 'da', tone: 3 }, ...]
//   tones('nǚ')               -> [3]
//   normalizeForSearch('Nǚ')  -> 'nv'
//
// Tone 5 means the neutral (light) tone. ü is written "v" in numbered and bare forms.

const TONE_MARKS = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4], ü: ['v', 0],
  ń: ['n', 2], ň: ['n', 3], ǹ: ['n', 4], ḿ: ['m', 2],
};

const INITIALS = 'b p m f d t n l g k h z c s zh ch sh r j q x y w'.split(' ');
const FINALS = ('a o e i u v ai ei ao ou an en ang eng ong ia ie iao iu ian in ' +
  'iang ing iong ua uo uai ui uan un uang ue ve van vn').split(' ');
export const SYLLABLES = new Set([
  ...FINALS,
  'er',
  ...INITIALS.flatMap((i) => FINALS.map((f) => i + f)),
  'm', 'n', 'ng', 'hm', 'hng',
]);

const STARTS_WITH_VOWEL = /^[aoe]/;

/** Split one written word (no spaces) into syllables, or return null. */
function splitWord(word) {
  // Map each written character to its bare letter and tone.
  const chars = [];
  for (const ch of word.normalize('NFC')) {
    const lower = ch.toLowerCase();
    const mark = TONE_MARKS[lower];
    chars.push(mark ? { ch, bare: mark[0], tone: mark[1] } : { ch, bare: lower, tone: 0 });
  }
  const bare = chars.map((c) => c.bare).join('');

  // Find every split into valid syllables and keep the least surprising one.
  // An apostrophe is written before a later syllable starting with a/o/e, so
  // such a syllable is unlikely here; erhua ("r" glued on) is also rare.
  // Ties go to the longer first syllable.
  const memo = new Map();
  const solve = (start) => {
    if (start === bare.length) return [[]];
    if (memo.has(start)) return memo.get(start);
    const out = [];
    for (let len = Math.min(6, bare.length - start); len >= 1; len--) {
      let piece = bare.slice(start, start + len);
      let erhua = false;
      if (!SYLLABLES.has(piece)) {
        // Erhua: a syllable followed by a bare "r" (e.g. wánr, yìdiǎnr).
        if (piece.endsWith('r') && SYLLABLES.has(piece.slice(0, -1)) && piece !== 'er') erhua = true;
        else continue;
      }
      for (const rest of solve(start + len)) out.push([[start, start + len, erhua], ...rest]);
    }
    const score = (seg) => seg.filter(([s, , erhua]) =>
      erhua || (s > 0 && STARTS_WITH_VOWEL.test(bare.slice(s)))).length;
    out.sort((a, b) => score(a) - score(b));
    memo.set(start, out.slice(0, 1));
    return memo.get(start);
  };

  const [best] = solve(0);
  if (!best) return null;
  return best.map(([s, e, erhua]) => {
    const part = chars.slice(s, e);
    const tone = part.reduce((t, c) => t || c.tone, 0) || 5;
    return { text: part.map((c) => c.ch).join(''), bare: bare.slice(s, e), tone, erhua };
  });
}

/** The readings of a word: "shéi/shuí" -> ["shéi", "shuí"]. */
export function readings(pinyin) {
  return pinyin.split('/').map((r) => r.trim()).filter(Boolean);
}

/**
 * Split pinyin like "dǎ diànhuà" or "mòmò-wúwén" into syllables. Throws on
 * invalid pinyin. Only the first reading is used when there are several.
 */
export function syllables(pinyin) {
  const out = [];
  for (const word of readings(pinyin)[0].normalize('NFC').split(/[\s\-'’·,…()]+/)) {
    if (!word) continue;
    const parts = splitWord(word);
    if (!parts) throw new Error(`Not valid pinyin: "${word}" in "${pinyin}"`);
    out.push(...parts);
  }
  return out;
}

/** Tone numbers, one per syllable of the first reading (5 = neutral). */
export function tones(pinyin) {
  return syllables(pinyin).map((s) => s.tone);
}

/** "bàba" -> "ba4 ba5", "nǚ'ér" -> "nv3 er2", "shéi/shuí" -> "shei2/shui2". */
export function toNumbered(pinyin) {
  return readings(pinyin)
    .map((r) => syllables(r).map((s) => s.bare + s.tone).join(' '))
    .join('/');
}

/**
 * Lower-case, tone-free, space-free form used by search, so "ài", "ai4",
 * "Ai" and "a i" all match. "ü"/"u:"/"v" all become "v".
 */
export function normalizeForSearch(text) {
  let s = text.normalize('NFC').toLowerCase().replace(/u:/g, 'v');
  s = [...s].map((ch) => (TONE_MARKS[ch] ? TONE_MARKS[ch][0] : ch)).join('');
  return s.replace(/[\s\-'’·0-9]/g, '');
}
