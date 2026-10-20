# Fullscreen textbook reader: diagnosis and verification

Audit date: 2026-10-20. Scope: the 23 hosted original PDFs and their library/reader
routes. No vocabulary, lessons, original PDF bytes, learner progress keys,
dependencies or deployment permissions are changed.

## Reproduced causes

1. Native library-to-reader navigation discarded the active document and worker.
   Each book opened another full site page, including normal navigation.
2. The rendered canvas stayed off-DOM until `getTextContent()` completed. Text
   layout then delayed the ready state further, although the image was readable.
3. The initial ResizeObserver callback scheduled an unnecessary render. Comparing
   `clientWidth` with `contentRect.width` would also include different padding;
   the observer now records its own initial width without scheduling work.
4. Loading had no inactivity deadline or initialization-specific recovery. Failed
   requests could leave a generic opening state without useful diagnosis.
5. Host capabilities materially affect loading. Astro preview does **not**
   advertise byte ranges: at 750,000 B/s and 100 ms latency, HSK 2 required the
   entire 28,221,758-byte file and took 38,974 ms to show its first canvas. A
   range-capable server needed about 435 KB and 4,665 ms for the original reader.
   This is a hosting-capability comparison, not a production before/after claim.
6. Direct production `curl --range 0-1023` returned HTTP 206, Accept-Ranges: bytes,
   Content-Range: bytes 0-1023/28221758 and exactly 1,024 bytes (0.903 s in that
   request). Production PDFs are same-origin static files, not Drive previews.
7. Original HSK 1 metadata needs several ranges near EOF before page one can be
   interpreted. Larger chunks reduced request count but increased transferred
   data and had inconsistent timing. The measured tradeoff did not justify
   changing the existing 256 KiB setting or rewriting original PDFs.

## Implementation

- Shared `PdfReader.astro` shell for direct URLs and the library's native modal
  dialog. Clicking a library link opens the viewport-filling shell synchronously,
  before importing PDF.js. Normal links remain a progressive fallback, including
  browsers without native dialogs and modified-click/open-in-new-tab behavior.
- `100dvh` with percentage fallback, safe-area padding, opaque page background,
  small glass toolbar, title, 44px controls, Close, page input/counter, zoom and
  direct access to highlights. No requestFullscreen dependency or browser-chrome
  hacks. The normal header/footer/tab bar are omitted from direct reader routes;
  the modal makes background content inert and inaccessible while reading.
- Modal history preserves reader URLs and page hashes, restores the library's
  title, scroll and focused link on Close/Back, and reopens on Forward. Page hash
  updates retain the history state. Background body scrolling is locked. Repeated
  Close events cannot trigger multiple history traversals. BFCache visits keep
  live controls rather than disposing their event listeners.
- One shared worker and at most one parsed document/loading task. Same-book
  reopening reuses it; changing books destroys the previous document. Pending
  loads are cancelled on close. Event listeners, observers, resize timers,
  rendering and text-layer tasks have explicit disposal. Generation tokens reject
  stale async results. Superseded canvases are zeroed and page resources cleaned.
- One-page rendering window: no all-pages canvas initialization. At most the old
  visible bitmap and replacement under construction coexist; each has the existing
  approximately six-million-pixel/2x cap. PDF.js caches parsed document data;
  automatic whole-book prefetch and streaming remain disabled so range-capable
  hosting transfers only required ranges. No speculative whole-page raster work.
- Commit the finished canvas immediately, then yield to paint and prepare text
  selection in bounded batches. Existing normalized highlights retain alignment
  through zoom/resize. Yellow joins red and soft gold; saved graphite remains
  supported. SHA-based highlight/position keys and learning/theme keys are unchanged.
- Separate initializing, loading/progress, rendering and text-preparation states.
  A 45-second **inactivity** watchdog resets when download progress arrives; it
  does not impose a total download-duration limit. Retry/Close remain available.
  Missing, invalid, password-protected, network and render failures are reported.
  A failed module/worker initialization can reload the reader on explicit Retry,
  avoiding permanently cached module-fetch failures.
- No download, share, print, export or open-original buttons, no Pencil/handwriting,
  OCR, external scripts, services or extra production dependencies.

## Lab measurements

Chromium, 390×844 touch emulation, Node 24.19 locally; CI uses Node 22. Timings are
individual lab samples, not field INP, physical Safari results or universal speed
promises. The static harness advertises real byte ranges and does not cache
responses. Cold PDF.js assets remain a material first-open cost on slow networks.
Before samples used the old reader and the same range-capable harness. Both
sessions opened another PDF before HSK 2; only the new modal preserves its worker.

| Interaction                           |    Before first canvas |        After first canvas | After shell paint |
| ------------------------------------- | ---------------------: | ------------------------: | ----------------: |
| HSK 2, second book, unthrottled       |                 651 ms |                    341 ms |             30 ms |
| HSK 2, second book, 750 KB/s + 100 ms |               4,665 ms |                  1,111 ms |             31 ms |
| Same HSK 2 reopened, unthrottled      |            Not sampled | 199 ms, zero PDF requests |             29 ms |
| Same HSK 2 reopened, throttled        |            Not sampled | 244 ms, zero PDF requests |             37 ms |
| Cold HSK 1, unthrottled               | Not sampled comparably |                    745 ms |             29 ms |
| Cold HSK 1, throttled                 | Not sampled comparably |                  7,912 ms |             50 ms |

Across eight after samples, shell paint was 28–50 ms, sampled open-event duration
32–80 ms, handler execution 8.5–21.5 ms, and individual long tasks peaked at 93 ms.
These sampled events are **not** a field INP measurement. HSK 2 first opening used
435,394 transferred bytes including HTTP overhead; HSK 1 used 2,379,703 bytes.
The first cold page still depends on PDF metadata, image decoding and network
speed; the UI never waits for that work to appear.

Reproduce with a fresh build and no other browser QA competing for CPU:

```sh
npm ci
npm run validate
npm run check-vocab
npm test
npm run build
npm run preview:pdf-profile  # separate terminal, loopback port 4326
PDF_PROFILE_BASE_URL=http://127.0.0.1:4326/Hsk-Learning/ npm run profile:reader-opening
npm run test:ui
PDF_QA_BASE_URL=http://127.0.0.1:4326/Hsk-Learning/ npm run audit:pdf
```

Use PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH when needed. Profiling records request
bytes/timing, canvas readiness, shell paint, EventTiming and long tasks in ignored
`artifacts/fullscreen-reader/opening.json`. The range preview is a development-only
static test tool, not a deployed backend. It binds only to loopback.

## QA coverage and limits

- New regressions: shell before any PDF response, close while loading, scroll/focus
  restoration, Back/Forward, cached reopen, worker reuse, switching books, rapid
  reopen, BFCache lifecycle, stalled connection/retry, invalid file, module failure
  recovery, a single initial canvas commit, yellow-note persistence and immersive
  direct routes. Existing tests cover coordinate taps, zoom, deep links, scanned
  pages, quota failure, highlight removal/geometry/cross-tab updates and progress.
- Existing learning tests retain vocabulary, lessons, multilingual search, flashcards,
  audio replacement/cancellation, appearance, progress, safe areas and keyboard use.
- Catalog QA renders first/middle/last pages of every hosted PDF (69 samples).
  Layout QA covers ten sizes, both themes and library/reader (40 cases), including
  320×568, 390×844, 768×1024, 1440×900 and 844×390 landscape. It checks overflow,
  errors, canvas budgets and practical 44px targets. Eight optional axe scans cover
  desktop/mobile light/dark surfaces. Before/after screenshots are inspected.
- Originals and saved data are unchanged. Text selection requires an existing text
  layer; scanned pages cannot be highlighted without OCR. Highlight storage is
  device/browser-local and can fail in private mode or when full. The two HSK 6
  textbooks exceeding GitHub's 100 MiB limit remain clearly labelled Drive-only.
- Physical iPhone Safari, VoiceOver and installed-PWA behavior are not verified by
  Chromium emulation. Public files remain obtainable through browser/network tools.
- Release-specific CI, merge SHA, Pages deployment and production checks are
  reported after merge; pre-merge lab results do not establish deployment success.
