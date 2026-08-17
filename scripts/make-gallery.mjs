// Builds an HTML gallery from any capture-runner.mjs output folder —
// screenshots + video clips on one sequential, browsable page, so you can
// quickly review a route's result visually instead of opening files one by one.
//
// Usage: node scripts/make-gallery.mjs raw/osint-full-capture

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const dirArg = process.argv[2];
if (!dirArg) {
  console.error("Usage: node scripts/make-gallery.mjs <capture-folder>");
  process.exit(1);
}

const IMG_EXT = new Set([".png", ".jpg", ".jpeg"]);
const VIDEO_EXT = new Set([".mp4", ".webm"]);

const files = readdirSync(dirArg)
  .filter((f) => statSync(join(dirArg, f)).isFile())
  .filter((f) => IMG_EXT.has(extname(f).toLowerCase()) || VIDEO_EXT.has(extname(f).toLowerCase()))
  .sort();

function mimeFor(ext) {
  return { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".webm": "video/webm" }[ext];
}

const items = files.map((f) => {
  const ext = extname(f).toLowerCase();
  const b64 = readFileSync(join(dirArg, f)).toString("base64");
  const isVideo = VIDEO_EXT.has(ext);
  const dataUri = `data:${mimeFor(ext)};base64,${b64}`;
  return { name: basename(f, ext), isVideo, dataUri };
});

const routeName = basename(dirArg.replace(/[\\/]+$/, ""));

const cardsHtml = items
  .map(
    (it, i) => `
    <article class="card">
      <p class="card-label">${String(i + 1).padStart(2, "0")} · ${it.name}</p>
      ${
        it.isVideo
          ? `<video class="card-media" controls loop muted playsinline><source src="${it.dataUri}"></video>`
          : `<img class="card-media" src="${it.dataUri}" alt="${it.name}" loading="lazy" />`
      }
    </article>`
  )
  .join("\n");

const html = `<title>${routeName} — preview</title>
<style>
  :root { --bg:#0a0d13; --surface:#12151f; --border:rgba(148,163,194,.14); --text:#e7ecf6; --muted:#8891a8; --cyan:#4eeaf0; }
  :root[data-theme="light"] { --bg:#f4f6fb; --surface:#fff; --border:rgba(30,41,59,.12); --text:#161b26; --muted:#5b6478; --cyan:#0891a3; }
  @media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) { --bg:#f4f6fb; --surface:#fff; --border:rgba(30,41,59,.12); --text:#161b26; --muted:#5b6478; --cyan:#0891a3; }
  }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: ui-monospace, "Cascadia Code", Consolas, monospace; margin: 0; padding: 32px 20px 80px; }
  h1 { font-size: 18px; margin: 0 0 24px; color: var(--cyan); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; max-width: 1200px; margin: 0 auto; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
  .card-label { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
  .card-media { width: 100%; border-radius: 6px; display: block; }
</style>
<h1>${routeName} — ${items.length} files</h1>
<div class="grid">
${cardsHtml}
</div>
`;

const outPath = join(dirArg, "gallery.html");
writeFileSync(outPath, html, "utf-8");
console.log("Gallery saved:", outPath);
