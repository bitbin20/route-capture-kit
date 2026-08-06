// Pirmais maršruta piemērs universālajam dzinējam (capture-runner.mjs).
// Taimingi kalibrēti empīriski 2026-08-06 — sk. task-charter checkpointu:
// ielādes ekrāns NAV laika ziņā ierobežots, tas ir "klikšķini, lai ieietu"
// vārti, pāreja pēc klikšķa nostājas ~2.8s.

export const route = [
  ["goto", "https://osint-framework.pages.dev/"],
  ["wait", 800],
  ["shot", "01-loading"],
  ["click", "INITIATING DISCOVERY"],
  ["wait", 2800],
  ["shot", "02-categories-fanned"],
];
