// HSK teaches Mandarin. A zh-HK (Cantonese) voice must not take precedence over
// Mandarin voices from Singapore or Taiwan when a Mainland voice is unavailable.
export function mandarinVoice(voices) {
  const candidates = voices.filter(
    (voice) =>
      /^(zh|cmn)(?:[-_]|$)/i.test(voice.lang) &&
      !/(?:[-_])HK(?:[-_]|$)/i.test(voice.lang),
  );
  return (
    candidates.find((voice) =>
      /^(zh|cmn)[-_](CN|SG)(?:[-_]|$)/i.test(voice.lang),
    ) ??
    candidates[0] ??
    null
  );
}
