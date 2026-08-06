// Ātrā savietojamības pārbaude PIRMS jauna maršruta rakstīšanas jaunai lapai.
// Jautājums, uz ko tā atbild: vai elementi ir teksta-adresējami (SVG/DOM),
// vai tikai canvas/WebGL zīmējums (tad clickText() nestrādās, vajadzēs
// koordinātu klikšķus vai cita pieeja pavisam).
//
// Lietošana: node scripts/check-compat.mjs <url>

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2];

if (!url) {
  console.error("Lietošana: node scripts/check-compat.mjs <url>");
  process.exit(1);
}

const outDir = join(__dirname, "..", "raw", "compat-checks");
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1152 } });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500); // dod laiku sākotnējām animācijām nostāties

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
      "⚠️ Iespējams tikai canvas/WebGL — teksta klikšķi (clickText) nestrādās. Vajadzēs koordinātu klikšķus (clickXY) vai citu pieeju.";
  } else if (info.svgTextNodes > 0 || info.clickableElements >= 3) {
    verdict = "✅ Der teksta-balstītiem klikšķiem (SVG/DOM elementi atrasti).";
  } else {
    verdict = "❓ Neskaidrs no datiem vien — apskaties screenshot.png un izlem vizuāli.";
  }

  console.log("\n" + verdict);
  console.log("Screenshot saglabāts:", shotPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
