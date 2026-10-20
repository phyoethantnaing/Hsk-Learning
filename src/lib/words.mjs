// All written words from data/words/**, sorted by id order within each level.
const files = import.meta.glob('../../data/words/**/*.json', { eager: true, import: 'default' });

/** @type {any[]} */
export const WORDS = Object.keys(files)
  .sort()
  .flatMap((path) => files[path]);

export function wordsForLevel(levelKey) {
  return WORDS.filter((w) => String(w.level) === String(levelKey));
}
