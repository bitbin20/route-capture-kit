// Universāls dzinējs: izpilda maršruta failu (skat. routes/*.mjs).
// Viens dzinējs der jebkurai lapai — katrai jaunai lapai vajag tikai jaunu
// maršruta failu ar soļu sarakstu, ne jaunu programmu.
//
// Soļu vārdnīca (apzināti maza, lai nesarežģītu):
//   ["goto", url]                — atver lapu
//   ["click", "teksts"]          — klikšķina uz elementa ar šo tekstu (SVG/DOM)
//   ["clickxy", x, y]            — klikšķina uz pikseļa koordinātas (canvas lapām)
//   ["wait", ms]                 — gaida fiksētu laiku
//   ["shot", "nosaukums"]        — saglabā screenshotu
//   ["clicktab", "teksts", "nosaukums"] — klikšķina uz elementa, kas atver JAUNU
//                                   cilni (piem. ārējs rīka links); uzņem screenshotu
//                                   no tās jaunās cilnes, aizver to, atgriežas pie
//                                   galvenās lapas nākamajam solim
//
// Lietošana (screenshoti):  node scripts/capture-runner.mjs routes/osint-framework.mjs
// Lietošana (video klips):  node scripts/capture-runner.mjs routes/osint-intro-video.mjs --video
//
// Video režīms ieraksta VISU maršrutu no sākuma līdz beigām kā vienu .webm/.mp4
// klipu (Playwright natīvais video ieraksts, ne ekrāna tveršana — nav DTS
// anomāliju, ar ko cīnījāmies iepriekš). Playwright neatbalsta patvaļīgu
// "sāc/beidz ierakstu vidū" — tāpēc video maršrutam jābūt savam, īsam,
// atsevišķam route failam (parasti tikai tā daļa, kur reāli kaut kas kustas,
// piem. ielādes animācija), ne visam garajam maršrutam uzreiz.

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
  console.error("Lietošana: node scripts/capture-runner.mjs routes/<fails>.mjs [--video]");
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
            console.warn(`clicktab: "${triggerText}" neatvēra jaunu cilni (turpinu bez screenshota)`);
          }
          break;
        }
        default:
          throw new Error(`nezināma darbība "${action}"`);
      }
    } catch (err) {
      throw new Error(
        `Solis ${i + 1}/${steps.length} neizdevās — ${JSON.stringify(steps[i])}\n  ${err.message}`
      );
    }
  }

  await context.close(); // pabeidz video failu (ja recordVideo aktīvs)
  await browser.close();

  if (wantsVideo) {
    const rawVideoPath = await page.video().path();
    const webmDest = join(outDir, `${routeName}.webm`);
    renameSync(rawVideoPath, webmDest);
    console.log("Video (.webm) saglabāts:", webmDest);

    const mp4Dest = join(outDir, `${routeName}.mp4`);
    try {
      execFileSync("ffmpeg", [
        "-y",
        "-i", webmDest,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        mp4Dest,
      ]);
      console.log("Video (.mp4) konvertēts:", mp4Dest);
    } catch (err) {
      console.warn("ffmpeg konvertācija neizdevās (webm fails tik un tā saglabāts):", err.message);
    }
  }

  console.log("Gatavs:", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
