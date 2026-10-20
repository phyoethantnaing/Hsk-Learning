// Written word content (data/words/**) and how it is grouped into lessons.
import { LEVELS } from './levels.mjs';
import { url } from './site.mjs';

const files = import.meta.glob('../../data/words/**/*.json', { eager: true, import: 'default' });

/** Every written word, in id order. */
export const WORDS = Object.keys(files)
  .sort()
  .flatMap((path) => files[path]);

/** Words per lesson ("သင်ခန်းစာ"). Small enough to feel achievable in one sitting. */
export const LESSON_SIZE = 20;

const levelKey = (w) => String(w.level);
const slugOf = (key) => LEVELS.find((l) => l.key === String(key)).slug;

export function wordsForLevel(key) {
  return WORDS.filter((w) => levelKey(w) === String(key));
}

/** Levels that have at least one written word (these get pages). */
export function readyLevels() {
  return LEVELS.filter((l) => wordsForLevel(l.key).length > 0);
}

/** [{ n: 1, words: [...] }, …] — lessons of LESSON_SIZE words in id order. */
export function lessonsFor(key) {
  const words = wordsForLevel(key);
  const lessons = [];
  for (let i = 0; i < words.length; i += LESSON_SIZE) {
    lessons.push({ n: lessons.length + 1, words: words.slice(i, i + LESSON_SIZE) });
  }
  return lessons;
}

export function lessonNumberOf(word) {
  const index = wordsForLevel(word.level).findIndex((w) => w.id === word.id);
  return Math.floor(index / LESSON_SIZE) + 1;
}

const bySimplified = new Map();
for (const w of WORDS) if (!bySimplified.has(w.simplified)) bySimplified.set(w.simplified, w);

/** The written word for a simplified form (first reading), if any. */
export function findWord(simplified) {
  return bySimplified.get(simplified);
}

export const levelSlug = (w) => slugOf(w.level);
export const wordUrl = (w) => url(`/${slugOf(w.level)}/${w.id}/`);
export const levelUrl = (key) => url(`/${slugOf(key)}/`);
export const lessonUrl = (key, n) => url(`/${slugOf(key)}/lesson/${n}/`);
export const flashcardsUrl = (key, n) => url(`/${slugOf(key)}/lesson/${n}/flashcards/`);
