// Small helpers used across pages.

/** Prefix a site path with the GitHub Pages base path: url('/hsk1') -> '/Hsk-Learning/hsk1'. */
export function url(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

const MY_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

/** 1234 -> '၁,၂၃၄' (Myanmar digits). */
export function myNumber(n) {
  return n.toLocaleString('en-US').replace(/[0-9]/g, (d) => MY_DIGITS[Number(d)]);
}
