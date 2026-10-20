// Proper nouns that example sentences may use even though they are not HSK words
// (data/example-vocab-allowlist.json). Shared by the data checks and the site.
import data from '../../data/example-vocab-allowlist.json' with { type: 'json' };

/** @type {{ word: string, pinyin: string, my: string }[]} */
export const ALLOWLIST = data.words;

/**
 * Allowlisted words used in a Chinese sentence, once per occurrence, in order.
 * allowlistedIn('我是缅甸人。') -> [{ word: '缅甸', pinyin: 'Miǎndiàn', my: 'မြန်မာနိုင်ငံ' }]
 */
export function allowlistedIn(zh) {
  const found = [];
  for (const entry of ALLOWLIST) {
    let i = zh.indexOf(entry.word);
    while (i !== -1) {
      found.push({ ...entry, index: i });
      i = zh.indexOf(entry.word, i + entry.word.length);
    }
  }
  return found.sort((a, b) => a.index - b.index).map(({ index, ...entry }) => entry);
}
