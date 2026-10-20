// Detects text written in the Zawgyi font encoding instead of Myanmar Unicode.
//
// Zawgyi reuses Myanmar code points in a visual order, so Zawgyi text breaks
// rules that real Unicode Burmese always follows. Each rule below is one of
// those impossible-in-Unicode patterns.

const CONSONANT = '\u1000-\u102A\u103F\u104E';

const RULES = [
  {
    // Zawgyi stores its many stacked/ligature shapes in U+1060–U+1097.
    // Burmese Unicode text never uses these (they belong to Mon, Shan, Karen…).
    name: 'Zawgyi-only shape characters (U+1060–U+1097)',
    re: /[\u1060-\u1097]/u,
  },
  {
    // Zawgyi types ေ before the consonant; Unicode always stores it after one.
    name: 'ေ (U+1031) not after a consonant',
    re: new RegExp(`(^|[^${CONSONANT}\u1039\u103A-\u103E])\u1031`, 'u'),
  },
  {
    // Medials ျ ြ must follow a consonant in Unicode (or the asat in spellings
    // like ယောက်ျား). Zawgyi types its ra-medial (U+103B) before the consonant.
    name: 'ျ/ြ (U+103B/U+103C) not after a consonant',
    re: new RegExp(`(^|[^${CONSONANT}\u103A])[\u103B\u103C]`, 'u'),
  },
  {
    // Zawgyi uses U+1039 as the visible "asat" (်). In Unicode, U+1039 is the
    // invisible stacker and must be followed by a consonant.
    name: '္ (U+1039) not followed by a consonant',
    re: /\u1039(?![\u1000-\u1021])/u,
  },
];

/** Returns the names of the Zawgyi rules `text` breaks (empty array = looks like Unicode). */
export function zawgyiProblems(text) {
  if (!/[\u1000-\u109F]/u.test(text)) return [];
  return RULES.filter((r) => r.re.test(text)).map((r) => r.name);
}

export function looksLikeZawgyi(text) {
  return zawgyiProblems(text).length > 0;
}
