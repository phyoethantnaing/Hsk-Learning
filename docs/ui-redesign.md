# Liquid Glass interface

The interface keeps Astro's static routes and `/Hsk-Learning/` base. No client
framework, backend, or animation library is used. The shared tokens live in
`src/styles/global.css`; `Icon`, `PageIntro`, the header/footer, and learning
components provide the reusable UI.

## Materials and typography

- Neutral white/charcoal surfaces and red actions, with stronger contrast in dark
  appearance. Pinyin tones retain syllable classes, explicit tone names, and pitch
  contours; their palette uses red and neutral shades.
- Solid cards provide a readable base. Only selected glass surfaces and the sticky
  navigation use progressive backdrop blur. Unsupported blur and reduced
  transparency fall back to solid surfaces.
- System UI fonts, Noto Sans Myanmar, Myanmar Text, and Padauk preserve Myanmar
  combining marks. Chinese uses PingFang/Noto CJK fallbacks. The existing Google
  Fonts stylesheet remains; no external scripts were added.
- Restrained transform transitions respect reduced motion. Controls provide
  visible focus and practical 44px minimum touch targets. Reading pages use a
  narrower measure than lesson grids.

## Preferences and content safety

`hsk-mm-theme-v1` stores `system`, `light`, or `dark`. The early inline script
applies the resolved appearance before rendering. System changes and changes in
other tabs update the UI. Storage failures leave controls usable in memory.

The existing `hsk-mm-progress-v1` key and progress storage implementation are
unchanged. Vocabulary data, IDs, lesson grouping, routes, licenses, and the Pages
deployment workflow are unchanged. Unpublished HSK levels stay unlinked.

## Verification

Use Node >=22.22.0 and the lockfile:

```sh
npm ci
npm run validate
npm run check-vocab
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:ui
```

CI performs these checks, plus PDF parsing and word synchronization. The browser
suite covers both desktop/light and mobile/dark, all page types, multilingual
search and network failure/retry, mobile keyboard navigation, system/manual
appearance, old saved progress, flashcard completion/retry/restart, audio dispatch,
Traditional Chinese switching, blocked storage, no-JavaScript reading, widths
320–1920px, landscape, 200% root text size, and reduced motion.

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium. To test a
completed production deployment without starting a local server:

```sh
PLAYWRIGHT_BASE_URL=https://phyoethantnaing.github.io/Hsk-Learning/ npm run test:ui
```

Automated accessibility audits supplement visual and keyboard review; they do not
establish complete WCAG conformance. Speech pronunciation depends on the device's
Chinese voices; the browser tests stub dispatch rather than claiming audible
pronunciation on every device. Physical iPhone/Safari testing remains useful.
