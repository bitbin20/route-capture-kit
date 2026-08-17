# route-capture-kit

Automate the collection of **screenshots and short video clips from interactive
web pages** (node-graph maps, SVG/DOM navigation trees), so a video editor never
has to manually screen-record and then trim timing glitches afterwards.

One generic engine drives everything — each new page needs only a small **route
file**, not new code.

> **What this is:** a *capture-to-montage* helper. It gathers raw material
> (screenshots, native browser video, a rough preview reel) to feed a real video
> editor (Remotion, CapCut, Premiere).
> **What this is not:** a final video editor, a visual-regression testing suite,
> or a general-purpose scraping framework. It deliberately stops at "rough
> preview" and hands off to your montage tool.

## Why this exists

Manually screen-recording every explainer video (Win+Alt+R / Game Bar / OBS)
needs a human clicking in the right order, and the output often carries DTS
timestamp anomalies that require extra trimming in post.

Playwright can open the page, replay the exact click sequence precisely and
repeatably, and record video **natively** (not through a screen-capture driver)
— which removes both problems at once. This kit wraps that into a tiny,
route-driven workflow aimed specifically at feeding a montage pipeline.

## How this differs from shot-scraper (and friends)

[shot-scraper](https://github.com/simonw/shot-scraper) is the mature, excellent
tool in this space — if you want documentation screenshots, visual regression,
or JS scraping, use it. It overlaps with the *capture* half of this kit and does
it more thoroughly.

route-capture-kit is narrower on purpose. Its point is the **montage-facing
pipeline** that shot-scraper doesn't cover:

| | route-capture-kit | shot-scraper |
|---|---|---|
| Primary goal | Feed a **video montage** (rough preview reel) | Documentation, regression, scraping |
| `make-gallery` | Yes — quick visual review of a capture run | No |
| `make-preview-video` | Yes — assembles a rough reel to check story flow | No |
| `check-compat` | Yes — canvas vs SVG/DOM diagnosis before writing a route | No |
| Route format | Tiny JS step vocabulary (`goto/click/clickxy/wait/shot/clicktab`) | YAML multi-step |
| Language / runtime | Node.js | Python |
| Maturity | Small personal tool | Mature, widely used |

If you don't need the gallery / preview-reel / compat steps, shot-scraper is
probably the better choice. This kit is for the specific case where captures are
raw material for a short video.

## Requirements

- Node.js (any recent LTS)
- [Playwright](https://playwright.dev) `^1.62` (`npm install`, then `npx playwright install chromium`)
- `ffmpeg` on your `PATH` (for video conversion and preview-reel assembly)

## Install

```bash
git clone https://github.com/bitbin20/route-capture-kit.git
cd route-capture-kit
npm install
npx playwright install chromium
```

Check that `ffmpeg` is available:

```bash
ffmpeg -version
```

## Quick start

```bash
# 1. Check whether a new page is even a good fit for this tool
node scripts/check-compat.mjs https://example.com

# 2. Capture screenshots from a ready route (3 examples in scripts/routes/)
node scripts/capture-runner.mjs scripts/routes/osint-full.mjs

# 3. Review the result as a page
node scripts/make-gallery.mjs raw/osint-full-capture

# 4. Or assemble a rough preview video from one or more capture folders
node scripts/make-preview-video.mjs raw/osint-intro-video-capture raw/osint-full-capture
```

## Tools

### `check-compat.mjs <url>`

Quick compatibility check **before** writing a new route. Answers: are the
elements text-addressable (SVG/DOM, so `click` will work), or is the page a
canvas/WebGL drawing (you'll need coordinate clicks, or a different approach
entirely)? Prints JSON with node counts, a verdict, and a screenshot
(`raw/compat-checks/screenshot.png`).

```bash
node scripts/check-compat.mjs https://osint-framework.pages.dev/
```

### `capture-runner.mjs <route.mjs> [--video]`

The generic engine. Runs a route file's step list in order. Without `--video`
it saves screenshots to `raw/<route-name>-capture/`. With `--video` it records
the **whole** route start-to-finish as one `.webm`/`.mp4` clip (Playwright
native video recording, not screen capture — no DTS anomalies). Playwright does
not support arbitrary "start/stop recording mid-run", so a video route should be
its own short, separate route file (only the part where something actually
moves).

**Step vocabulary** (the `route` array in a route file):

| Step | Action |
|---|---|
| `["goto", url]` | Open the page |
| `["click", "text"]` | Click the element containing this text (SVG/DOM, not exact match) |
| `["clickxy", x, y]` | Click a pixel coordinate (for canvas pages where text clicks fail) |
| `["wait", ms]` | Wait a fixed time |
| `["shot", "name"]` | Save a screenshot with this name |
| `["clicktab", "text", "name"]` | Click an element that opens a NEW tab (external link); screenshot the new tab, close it, return to the main page |

If a step fails, the error shows the step number and the step itself (`Step 5/8
failed — ["click","OpSec"] ...`), so you don't have to guess where the route
broke.

### `make-gallery.mjs <capture-folder>`

Builds a browsable HTML gallery (`gallery.html` in the same folder) from any
`capture-runner.mjs` output — all screenshots and video clips in order, numbered
and labelled.

### `make-preview-video.mjs <folder1> [folder2 ...]`

Stitches already-captured assets (screenshots + video clips) into one rough
preview video, in the folder order given on the command line. Images show for
1.5s each. **This is not the final cut** — just a fast "does the story flow"
check before you assemble it properly in Remotion/CapCut. Output:
`raw/preview-<folders>.mp4`.

## Writing a new route

1. `node scripts/check-compat.mjs <url>` — confirm the page is a fit.
2. Explore the page manually; find the exact texts/buttons to click and the order.
3. Write `scripts/routes/<name>.mjs`:
   ```js
   export const route = [
     ["goto", "https://example.com"],
     ["wait", 1000],
     ["click", "Something"],
     ["wait", 800],
     ["shot", "01-result"],
   ];
   ```
4. `node scripts/capture-runner.mjs scripts/routes/<name>.mjs`

Timings (`wait` values) have to be calibrated empirically per page — many pages
(e.g. "click to enter" loading screens) are *not* time-bounded; they wait for a
real click rather than disappearing after X seconds.

## Known limitations

- **`clickxy` is unproven in practice.** It's in the vocabulary, but every page
  tried so far has been text-addressable (SVG/DOM), so a canvas-type page hasn't
  been tested for real yet.
- **No automatic retry logic.** If a step fails (e.g. slow network) the script
  just exits with an error. Deliberate choice — retry logic adds complexity this
  tool (personal use, not CI) doesn't need.
- **`check-compat.mjs` heuristics are coarse** (canvas vs SVG text-node counts).
  It correctly diagnosed the only case tested so far, but hasn't been validated
  against a wide range of pages.
- **Timings are hard-coded in seconds**, not event-based (except `clicktab`,
  which waits on a real `page` event). Some pages' CSS opacity-fade animations
  don't signal "done" to Playwright's `waitFor`, so an empirically measured
  `wait` is the simplest reliable option.
- **Default viewport (1920×1152)** was chosen to match a specific downstream
  Remotion project. Change the `VIEWPORT` constant in `capture-runner.mjs` and
  `check-compat.mjs` if you need a different resolution.

## Project structure

```
scripts/
  check-compat.mjs
  capture-runner.mjs
  make-gallery.mjs
  make-preview-video.mjs
  routes/
    osint-framework.mjs   # screenshot route (example)
    osint-full.mjs        # full route with clicktab steps (example)
    osint-intro-video.mjs # video route (example)
raw/
  <route>-capture/        # capture-runner.mjs output (git-ignored)
  compat-checks/          # check-compat.mjs output (git-ignored)
  preview-<...>.mp4       # make-preview-video.mjs output (git-ignored)
```

## Author's note

I built this for my own short-video workflow while producing AI explainer
content in Latvian. It is intentionally small: I'd rather have simple,
reference-driven tools I can point at a task and let the model do the rest, than
one big "automate everything" system. Sharing the steps, not just the result.

*Latviski: šo rīku uztaisīju savai īso video darbplūsmai, veidojot AI
skaidrojošo saturu latviski. Apzināti mazs, bez overengineering — labāk
vienkārši, references vadīti rīki, kuriem viegli norādīt vajadzīgo maršrutu,
nekā viena liela "izdari visu" automatizācija.*

## License

[MIT](LICENSE).
