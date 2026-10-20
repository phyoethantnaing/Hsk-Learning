# HSK PDF reading room: implementation and QA

Public source inspected on 2026-10-20:
https://drive.google.com/drive/folders/1vK0IFnJ_LMZriPrFmsHzlskQ8c_fN6fV

## Import and hosting decisions

The public folder lists 18 PDFs across HSK 1–6. Sixteen originals were fetched
without credentials, cookies, conversion or recompression. Their combined size is
618,837,856 bytes. Each download matched the folder's exact byte size, started
with the PDF signature, passed Poppler metadata inspection, and was hashed with
SHA-256. No duplicate hashes exist among these imports and the seven existing
vocabulary-source PDFs. `data/pdf-library.json` retains source IDs, filenames,
byte sizes, page counts and hashes; `npm run check-pdfs` verifies these properties.

Two originals exceed GitHub's 100 MiB per-file limit (104,857,600 bytes). They were
not imported, split, compressed, or replaced with Git LFS pointers. The library
clearly labels them as source-only and links to their original Drive viewers.
The 16 imports plus seven existing sources fit within the 1 GB Pages site limit.
Large originals consume bandwidth; PDFs load only when a reader is opened.

| Original filename   | HSK | Exact bytes | Pages | Result                    |
| ------------------- | --: | ----------: | ----: | ------------------------- |
| HSK-1-Textbook.pdf  |   1 |  53,494,483 |   150 | Imported unchanged        |
| HSK-1-Workbook.pdf  |   1 |  30,063,554 |   139 | Imported unchanged        |
| HSK-2-Textbook.pdf  |   2 |  28,221,758 |   151 | Imported unchanged        |
| HSK-2-Workbook.pdf  |   2 |  22,148,933 |   170 | Imported unchanged        |
| HSK-3-Textbook.pdf  |   3 |  37,948,022 |   207 | Imported unchanged        |
| HSK-3-Workbook.pdf  |   3 |  41,596,100 |   167 | Imported unchanged        |
| HSK-4A-Textbook.pdf |   4 |  51,439,082 |   153 | Imported unchanged        |
| HSK-4A-Workbook.pdf |   4 |  27,138,135 |   111 | Imported unchanged        |
| HSK-4B-Textbook.pdf |   4 |  63,875,342 |   168 | Imported unchanged        |
| HSK-4B-Workbook.pdf |   4 |  35,524,106 |   120 | Imported unchanged        |
| HSK-5A-Textbook.pdf |   5 |  25,848,528 |   195 | Imported unchanged        |
| HSK-5A-Workbook.pdf |   5 |  32,105,382 |   142 | Imported unchanged        |
| HSK-5B-Textbook.pdf |   5 |  24,813,258 |   188 | Imported unchanged        |
| HSK-5B-Workbook.pdf |   5 |  50,494,777 |   221 | Imported unchanged        |
| HSK-6A-Textbook.pdf |   6 | 105,148,446 |     — | External: exceeds 100 MiB |
| HSK-6A-Workbook.pdf |   6 |  44,204,365 |   181 | Imported unchanged        |
| HSK-6B-Textbook.pdf |   6 | 114,026,280 |     — | External: exceeds 100 MiB |
| HSK-6B-Workbook.pdf |   6 |  49,922,031 |   198 | Imported unchanged        |

References: [GitHub file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github),
[Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Reader and design

The subsequent [fullscreen reader diagnosis and QA](fullscreen-reader-qa.md)
describes the current loading lifecycle, performance evidence and modal history.

- `/library/` groups original textbooks, workbooks and vocabulary resources by
  level. Homepage and footer provide native, base-path-aware links. Library and
  the library retains the learning tab's active state. Fullscreen reader routes
  omit the website navigation. Books remain distinct from unfinished interactive lessons.
- `/reader/<document-id>/` provides native previous/next buttons, direct page
  input, zoom, fit width, page deep links and locally remembered reading position.
- Pinned Mozilla PDF.js 6.4.299 (Apache 2.0) runs its decoder in a local worker.
  CMaps, standard fonts, ICC profiles and WASM decoders are served locally, with
  upstream licenses. No paid API, backend, external script or CDN is used.
- One visible page is rendered at a time. Raster density is capped at 2× and
  approximately six million pixels. Previous-page resources are cleaned up.
  Rapid requests cancel old tasks, and generation tokens prevent stale commits.
  Page turns restore the top of a scrolled page below the toolbar without moving
  controls that are already visible. Old highlight overlays hide while rendering.
  Range requests are enabled and automatic whole-document prefetch is disabled.
  Control feedback paints before rendering resumes, and PDF.js receives text in
  bounded 60-item stream batches, yielding between batches for input and paint.
- Glass stays on the compact control layer. Quiet surfaces, Chinese gold details,
  red primary actions and existing light/dark themes preserve the site's identity.
  Original PDF page colors remain intact. Decorative highlight overlays never
  receive pointer events. Natural scrolling, text selection and browser zoom work.
- Text selection can be saved in yellow, red or soft gold; legacy graphite notes remain supported. Page-relative rectangles
  remain aligned when zooming or resizing. The saved list supports page jumps and
  individual deletion, with screen-reader labels and native keyboard controls.
- New, per-document SHA-256-based storage keys keep highlights and reading position
  separate from `hsk-mm-progress-v1` and `hsk-mm-theme-v1`. Validated Unicode data,
  cross-tab refresh, failed writes, malformed storage and quota errors are handled.
  A book has a 1,000-highlight limit; each selection supports up to 4,000 characters
  and 200 text segments. Larger selections are explained rather than truncated.
  Storage failures are visibly reported.
- There are no reader Download, Share, Print or Export controls and no Apple Pencil
  integration. Public PDF URLs and browser features remain available. Hiding UI
  controls is not access protection. Source copyrights and existing attribution
  are preserved; PDFs are not relicensed under the software's MIT license.

## Verification

Local results are recorded below. Reproducible commands:

```sh
npm ci
npm run validate
npm run check-vocab
npm test
npm run build                 # includes original-PDF integrity/site-size check
npm run check-pdfs
npm run parse-pdfs
npm run sync-words
git diff --exit-code data/raw data/words
npm run test:ui
npm run audit:pdf              # first/middle/last of every hosted PDF + layout QA
```

`tests/pdf-reader.spec.mjs` covers the catalog, original scans, coordinate single
taps, page/zoom/fit, refresh/deep links, rapid navigation cancellation, colored
highlights, deletion, reload persistence, progress preservation, failed downloads,
retry, full storage, cross-tab updates, keyboard controls and 200% text at 320px.
The preexisting learning, search, audio, appearance, progress and touch tests remain
part of the complete suite. No educational content is rewritten by this change.
New main-branch vocabulary additions are preserved through a normal branch merge.

`npm run audit:pdf` renders the first, middle and last pages of all 23 hosted
originals and inspects library/reader layouts at 320×568, 375×667, 390×844,
393×852, 402×874, 430×932, 768×1024, 1024×1366, 1440×900 and 844×390, in both
themes. It checks console/runtime/resource errors, horizontal overflow, canvas
budgets and touch target dimensions. Optional local axe integration checks WCAG
2/2.1/2.2 A/AA rules. Screenshots and raw results live in ignored `artifacts/pdf-reader/`.

## Limitations

- Image-only scans cannot support text selection/highlighting without an OCR layer.
  Even some PDFs with text contain text only on selected pages. The reader reports
  availability for each rendered page. No OCR service or modified PDF is introduced.
- Highlights stay in this browser and are not embedded into the original PDF or
  synced to other devices. Clearing site storage removes them; existing learning
  progress is never reset by the reader.
- Browser QA uses Chromium touch/viewport emulation. Physical iPhone Safari,
  VoiceOver, installed-PWA and Apple Pencil behavior are not claimed as verified.
  Older browsers without necessary PDF.js capabilities receive a retry/error state.
- This is an accessible web recreation of material qualities, not native UIKit or
  SwiftUI materials. PDF.js and document loading start only when a reader opens, including the library modal.

## Local results (2026-10-20)

- Clean lockfile installation, data validation and all unit tests pass. All 909
  example sentences pass the level vocabulary check. The parser reproduces all
  11,000 source entries, and sync leaves educational files unchanged relative to main.
- Final integrated learning/reader regression: **90 cases passed** in desktop
  light and mobile dark appearances, including the scheduling refinement,
  selection limits, cross-tab updates and keyboard/text-zoom regression checks.
  The expanded reader suite also passed 22 cases independently, including the
  final review regression for page-turn scroll position and stable tap targets.
- Production build: 528 static pages; approximately 646.5 MB, under the 1 GB limit.
  All 23 hosted originals pass size/signature/hash/deduplication checks. The 16
  Drive imports contain 2,661 pages in total; no document was recompressed.
- Visual QA: 69 first/middle/last page samples, 40 responsive/theme layouts,
  eight axe states; no runtime/resource errors, overflow, small-control findings,
  canvas-budget failures or automated WCAG violations. Screenshots were inspected
  in mobile/desktop light/dark appearances; a narrow label-wrap defect was fixed.

### Render scheduling measurements

`npm run profile:pdf` measures five coordinate taps (next, next, previous, zoom,
fit) on a vocabulary PDF and an image-scanned textbook, at 390×844 with normal
and 4× simulated CPU speed. The before/after builds were measured sequentially
on the same host with no other browser tests running. Results below are maximum
recorded Event Timing interaction durations from those small scripted samples,
**not field INP**, physical-device measurements, or guaranteed frame rates.

| CPU         | Document            | Before | After |
| ----------- | ------------------- | -----: | ----: |
| Normal      | HSK 1 vocabulary    |  48 ms | 48 ms |
| Normal      | HSK 2 textbook scan |  96 ms | 48 ms |
| 4× slowdown | HSK 1 vocabulary    | 168 ms | 56 ms |
| 4× slowdown | HSK 2 textbook scan | 304 ms | 56 ms |

For the five interactions at 4× CPU, the sum of long-task time beyond 50 ms fell
from 1,827 to 406 ms for vocabulary and 1,039 to 614 ms for the scan. Yielding can
increase total page-render time slightly while keeping control feedback prompt.
Image decoding still causes long tasks; they are not claimed to be eliminated.
Observed layout shift remained approximately 0.055–0.064 in these lab runs.
Raw measurements: `artifacts/pdf-reader/performance-controlled-{before,after}.json`.
