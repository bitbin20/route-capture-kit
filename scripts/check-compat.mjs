// Quick compatibility check BEFORE writing a new route for a new page.
// The question it answers: are the elements text-addressable (SVG/DOM), or is
// the page just a canvas/WebGL drawing (in which case clickText() won't work
// and you'll need coordinate clicks, or a different approach entirely)?
//
// Usage: node scripts/check-compat.mjs <url>

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/check-compat.mjs <url>");
  process.exit(1);
}

const outDir = join(__dirname, "..", "raw", "compat-checks");
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1152 } });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500); // give initial animations time to settle

  const info = await page.evaluate(() => {
    return {
      canvases: document.querySelectorAll("canvas").length,
      svgTextNodes: document.querySelectorAll("svg text, svg tspan").length,
      clickableElements: document.querySelectorAll(
        "button, a, [role=button], [onclick]"
      ).length,
      visibleBodyTextLength: document.body.innerText.trim().length,
    };
  });

  const shotPath = join(outDir, "screenshot.png");
  await page.screenshot({ path: shotPath });
  await browser.close();

  console.log(JSON.stringify(info, null, 2));

  let verdict;
  if (info.canvases > 0 && info.svgTextNodes === 0 && info.clickableElements < 3) {
    verdict =
      "⚠️  Likely canvas/WebGL only — text clicks (clickText) won't work. You'll need coordinate clicks (clickXY) or a different approach.";
  } else if (info.svgTextNodes > 0 || info.clickableElements >= 3) {
    verdict = "✅  Fits text-based clicks (SVG/DOM elements found).";
  } else {
    verdict = "❓  Unclear from the data alone — look at screenshot.png and decide visually.";
  }

  console.log("\n" + verdict);
  console.log("Screenshot saved:", shotPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
