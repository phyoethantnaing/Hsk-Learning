// Detects text written in the Zawgyi font encoding instead of Myanmar Unicode.
//
// Zawgyi reuses Myanmar code points in a visual order, so Zawgyi text breaks
// rules that real Unicode Burmese always follows. Each rule below is one of
// those impossible-in-Unicode patterns.

const CONSONANT = 'က-ဪဿ၎';

const RULES = [
  {
    // Zawgyi stores its many stacked/ligature shapes in U+1060–U+1097.
    // Burmese Unicode text never uses these (they belong to Mon, Shan, Karen…).
    name: 'Zawgyi-only shape characters (U+1060–U+1097)',
    re: /[ၠ-႗]/u,
  },
  {
    // Zawgyi types ေ before the consonant; Unicode always stores it after one.
    name: 'ေ (U+1031) not after a consonant',
    re: new RegExp(`(^|[^${CONSONANT}္်-ှ])ေ`, 'u'),
  },
  {
    // Medials ျ ြ must directly follow a consonant in Unicode. Zawgyi types
    // its ra-medial (U+103B) before the consonant.
    name: 'ျ/ြ (U+103B/U+103C) not after a consonant',
    re: new RegExp(`(^|[^${CONSONANT}])[ျြ]`, 'u'),
  },
  {
    // Zawgyi uses U+1039 as the visible "asat" (်). In Unicode, U+1039 is the
    // invisible stacker and must be followed by a consonant.
    name: '္ (U+1039) not followed by a consonant',
    re: /္(?![က-အ])/u,
  },
];

/** Returns the names of the Zawgyi rules `text` breaks (empty array = looks like Unicode). */
export function zawgyiProblems(text) {
  if (!/[က-႟]/u.test(text)) return [];
  return RULES.filter((r) => r.re.test(text)).map((r) => r.name);
}

export function looksLikeZawgyi(text) {
  return zawgyiProblems(text).length > 0;
}
