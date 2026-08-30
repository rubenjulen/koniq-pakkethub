// Genereert de BugaWuga PWA-/app-iconen (kangoeroe-tegel) uit één bron-SVG.
// Draai: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = join(ROOT, "public", "icons");
mkdirSync(ICONS, { recursive: true });

const GREEN = "#6ea82c";
const KANGAROO =
  "M52 21C49 19 48 16 46 15C46 10 48 6 50 7C50 10 49 13 48 14C45 14 43 17 41 20C37 24 33 28 31 34C30 38 31 42 34 44C31 45 28 48 26 52C25 54 27 55 29 53C32 50 35 48 38 47C42 47 46 49 49 51C50 51 50 49 48 48C45 46 43 45 42 42C42 38 43 35 45 33C47 33 49 32 49 35C50 34 50 31 48 30C46 29 46 26 48 25C49 24 51 23 52 21Z";

// Afgeronde tegel (voor browser-tab + "any"-iconen).
const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="3" y="3" width="58" height="58" rx="15" fill="${GREEN}"/>
  <path fill="#fff" d="${KANGAROO}"/>
</svg>`;

// Volledig gevuld vierkant, kangoeroe gecentreerd in de veilige zone (maskable/apple).
const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${GREEN}"/>
  <g transform="translate(32,32) scale(0.82) translate(-39,-30)">
    <path fill="#fff" d="${KANGAROO}"/>
  </g>
</svg>`;

const jobs = [
  ["icon-192.png", tileSvg, 192],
  ["icon-512.png", tileSvg, 512],
  ["maskable-512.png", fullSvg, 512],
  ["apple-touch-icon.png", fullSvg, 180],
];

for (const [name, svg, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(ICONS, name));
  console.log("geschreven:", name, `${size}x${size}`);
}
