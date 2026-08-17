// Generic engine: runs a route file (see routes/*.mjs).
// One engine drives any page — each new page needs only a new route file with a
// step list, not a new program.
//
// Step vocabulary (deliberately small, to keep things simple):
//   ["goto", url]                — open the page
//   ["click", "text"]            — click the element containing this text (SVG/DOM)
//   ["clickxy", x, y]            — click a pixel coordinate (for canvas pages)
//   ["wait", ms]                 — wait a fixed time
//   ["shot", "name"]             — save a screenshot
//   ["clicktab", "text", "name"] — click an element that opens a NEW tab (e.g. an
//                                   external tool link); screenshot the new tab,
//                                   close it, return to the main page for the
//                                   next step
//
// Usage (screenshots):  node scripts/capture-runner.mjs scripts/routes/osint-framework.mjs
// Usage (video clip):   node scripts/capture-runner.mjs scripts/routes/osint-intro-video.mjs --video
//
// Video mode records the WHOLE route start-to-finish as one .webm/.mp4 clip
// (Playwright native video recording, not screen capture — no DTS anomalies).
// Playwright does not support arbitrary "start/stop recording mid-run", so a
// video route should be its own short, separate route file (usually just the
// part where something actually moves, e.g. a loading animation), not the whole
// long route at once.

import { chromium } from "playwright";
import { mkdirSync, renameSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWPORT = { width: 1920, height: 1152 };

const routeArg = process.argv[2];
const wantsVideo = process.argv.includes("--video");

if (!routeArg) {
  console.error("Usage: node scripts/capture-runner.mjs routes/<file>.mjs [--video]");
  process.exit(1);
}

const routeModule = await import(pathToFileURL(join(process.cwd(), routeArg)).href);
const steps = routeModule.route;
const routeName = basename(routeArg, ".mjs");

const outDir = join(__dirname, "..", "raw", `${routeName}-capture`);
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const contextOptions = { viewport: VIEWPORT };
  if (wantsVideo) {
    contextOptions.recordVideo = { dir: outDir, size: VIEWPORT };
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  for (let i = 0; i < steps.length; i++) {
    const [action, ...args] = steps[i];

    try {
      switch (action) {
        case "goto":
          await page.goto(args[0], { waitUntil: "domcontentloaded" });
          break;
        case "click":
          await page.getByText(args[0], { exact: false }).first().click();
          break;
        case "clickxy":
          await page.mouse.click(args[0], args[1]);
          break;
        case "wait":
          await page.waitForTimeout(args[0]);
          break;
        case "shot":
          await page.screenshot({ path: join(outDir, `${args[0]}.png`) });
          break;
        case "clicktab": {
          const [triggerText, shotName] = args;
          const [popup] = await Promise.all([
            context.waitForEvent("page", { timeout: 8000 }).catch(() => null),
            page.getByText(triggerText, { exact: false }).first().click(),
          ]);
          if (popup) {
            await popup.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
            await popup.waitForTimeout(1000);
            if (shotName) {
              await popup.screenshot({ path: join(outDir, `${shotName}.png`) });
            }
            await popup.close();
          } else {
            console.warn(`clicktab: "${triggerText}" did not open a new tab (continuing without a screenshot)`);
          }
          break;
        }
        default:
          throw new Error(`unknown action "${action}"`);
      }
    } catch (err) {
      throw new Error(
        `Step ${i + 1}/${steps.length} failed — ${JSON.stringify(steps[i])}\n  ${err.message}`
      );
    }
  }

  await context.close(); // finalizes the video file (if recordVideo is active)
  await browser.close();

  if (wantsVideo) {
    const rawVideoPath = await page.video().path();
    const webmDest = join(outDir, `${routeName}.webm`);
    renameSync(rawVideoPath, webmDest);
    console.log("Video (.webm) saved:", webmDest);

    const mp4Dest = join(outDir, `${routeName}.mp4`);
    try {
      execFileSync("ffmpeg", [
        "-y",
        "-i", webmDest,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        mp4Dest,
      ]);
      console.log("Video (.mp4) converted:", mp4Dest);
    } catch (err) {
      console.warn("ffmpeg conversion failed (the .webm file was still saved):", err.message);
    }
  }

  console.log("Done:", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
