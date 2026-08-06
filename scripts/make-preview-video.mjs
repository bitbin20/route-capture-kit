// Saliek jau uzņemtos resursus (screenshoti + video klipi no vienas vai
// vairākām capture-runner.mjs izvades mapēm) vienā rupjā priekšskatījuma
// video — lai maršrutu var noskatīties kā video, nevis pārlūkot kā lapu.
// NAV gala montāža (tā paliek Remotion/CapCut ziņā) — tikai ātrs "vai stāsts
// plūst" pārbaudījums bez manuālas salikšanas.
//
// Lietošana: node scripts/make-preview-video.mjs raw/osint-intro-video-capture raw/osint-full-capture
// (mapes tiek saliktas tieši tādā secībā, kādā tās nosauktas)

import { readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";

const dirArgs = process.argv.slice(2);
if (dirArgs.length === 0) {
  console.error("Lietošana: node scripts/make-preview-video.mjs <mape1> [mape2 ...]");
  process.exit(1);
}

const VIEWPORT = { width: 1920, height: 1152 };
const IMAGE_SECONDS = 1.5;
const IMG_EXT = new Set([".png", ".jpg", ".jpeg"]);
const VIDEO_EXT = new Set([".mp4"]);

const workDir = join(process.cwd(), "raw", "preview-tmp");
mkdirSync(workDir, { recursive: true });

let segmentIndex = 0;
const segmentPaths = [];

for (const dir of dirArgs) {
  const files = readdirSync(dir)
    .filter((f) => statSync(join(dir, f)).isFile())
    .filter((f) => IMG_EXT.has(extname(f).toLowerCase()) || VIDEO_EXT.has(extname(f).toLowerCase()))
    .sort();

  for (const f of files) {
    const ext = extname(f).toLowerCase();
    const src = join(dir, f);
    const segPath = join(workDir, `seg-${String(segmentIndex).padStart(3, "0")}.mp4`);
    segmentIndex++;

    if (IMG_EXT.has(ext)) {
      execFileSync("ffmpeg", [
        "-y", "-loop", "1", "-i", src,
        "-t", String(IMAGE_SECONDS),
        "-vf", `scale=${VIEWPORT.width}:${VIEWPORT.height}`,
        "-r", "25", "-pix_fmt", "yuv420p",
        segPath,
      ]);
    } else {
      execFileSync("ffmpeg", [
        "-y", "-i", src,
        "-vf", `scale=${VIEWPORT.width}:${VIEWPORT.height}`,
        "-r", "25", "-pix_fmt", "yuv420p", "-an",
        segPath,
      ]);
    }
    segmentPaths.push(segPath);
    console.log("Segments gatavs:", basename(segPath), "no", f);
  }
}

if (segmentPaths.length === 0) {
  console.error("Nav atrasts neviens attēls/video norādītajās mapēs.");
  process.exit(1);
}

const listPath = join(workDir, "concat-list.txt");
writeFileSync(listPath, segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"), "utf-8");

const outName = dirArgs.map((d) => basename(d.replace(/[\\/]+$/, ""))).join("__");
const outPath = join(process.cwd(), "raw", `preview-${outName}.mp4`);

execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath]);

console.log("Priekšskatījuma video gatavs:", outPath);
