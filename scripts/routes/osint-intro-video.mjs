// Video route (not screenshots) — only the loading animation and transition,
// since that's the one genuinely moving moment on this page where video looks
// better than a static PNG. Run with the --video flag.

export const route = [
  ["goto", "https://osint-framework.pages.dev/"],
  ["wait", 1500],
  ["click", "INITIATING DISCOVERY"],
  ["wait", 2800],
];
