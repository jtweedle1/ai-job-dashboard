// Guards Trailhead against drift (DESIGN.md §13): fails `npm run lint` when app/ or components/
// use a pattern the design system retired. Comments are skipped so a rule can be explained in place.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const RULES = [
  [/\bbackdrop-blur\b|\bbg-gradient-|radial-gradient/, "blur and gradients are gone; surfaces are flat paper"],
  [/\btext-xs\b|\btext-\[1[01]px\]|\btext-\[10px\]/, "text below the meta size; use text-meta or text-note"],
  [/\b(?:text|bg|border|ring|from|via|to|fill|stroke|decoration)-(?:gray|primary|slate|zinc|neutral)-\d/, "old neutral or primary scale; use ink, rule, well or action tokens"],
  [/\b[a-z]+-(?:blue|violet|purple|pink|orange|indigo|emerald|amber|red|green|yellow|rose|peach)-\d/, "stock hue class; use a semantic token"],
  [/\buppercase\b|\btracking-widest\b/, "labels are sentence case"],
  [/\bshadow-(?:md|lg|xl|2xl)\b/, "large shadows; use shadow-sheet or shadow-overlay"],
];

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(tsx|ts|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) yield path;
  }
}

const problems = [];
for (const root of ROOTS) {
  for await (const file of files(root)) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$|\/\*.*?\*\/|^\s*\*.*$/g, "");
      for (const [pattern, why] of RULES) {
        if (pattern.test(code)) problems.push(`${file}:${i + 1}  ${why}\n    ${line.trim()}`);
      }
    });
  }
}

if (problems.length) {
  console.error(`check-design: ${problems.length} use${problems.length === 1 ? "" : "s"} of retired patterns (see DESIGN.md §13)\n`);
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check-design: ok");
