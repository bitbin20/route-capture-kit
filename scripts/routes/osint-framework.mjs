// First route example for the generic engine (capture-runner.mjs).
// Timings calibrated empirically 2026-08-06: the loading screen is NOT
// time-bounded — it's a "click to enter" gate; the transition settles ~2.8s
// after the click.

export const route = [
  ["goto", "https://osint-framework.pages.dev/"],
  ["wait", 800],
  ["shot", "01-loading"],
  ["click", "INITIATING DISCOVERY"],
  ["wait", 2800],
  ["shot", "02-categories-fanned"],
];
