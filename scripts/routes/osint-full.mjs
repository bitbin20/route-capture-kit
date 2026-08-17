// Full OSINT Framework route. Found by exploring manually: OpSec contains both
// Persona Creation AND Anonymous Browsing as direct children (not separate
// branches), TOR expands one more step into Tor Download / I2P Anonymous
// Network, and clicking the root returns the full-screen centered view (a good
// closing frame).

export const route = [
  ["goto", "https://osint-framework.pages.dev/"],
  ["wait", 1500],
  ["click", "INITIATING DISCOVERY"],
  ["wait", 2800],
  ["shot", "01-intro-tree"],

  ["click", "OpSec"],
  ["wait", 1200],
  ["shot", "02-opsec"],

  ["click", "Persona Creation"],
  ["wait", 1200],
  ["shot", "03-persona-creation"],

  ["clicktab", "Random User Generator", "04-random-user-generator-site"],

  ["click", "Anonymous Browsing"],
  ["wait", 1200],
  ["shot", "05-anonymous-browsing"],

  ["click", "TOR"],
  ["wait", 1200],
  ["shot", "06-tor-expanded"],

  ["clicktab", "Tor Download", "07-tor-download-site"],

  ["click", "OSINT Framework"],
  ["wait", 1200],
  ["shot", "08-final-root"],
];
