// scripts/pack-overlay.mjs
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { zip } from "zip-a-folder";

const root = process.cwd();
const candidates = [
  "extensions/chrome-quirra-overlay",
  "extensions/chrome-quirra-overlay/dist",
  "quirra-frontend/extensions/chrome-quirra-overlay",
  "quirra-frontend/apps/extensions/chrome-quirra-overlay",
  "apps/extensions/chrome-quirra-overlay"
].map(p => path.join(root, p));

const src = candidates.find(p => existsSync(path.join(p, "manifest.json")));
if (!src) {
  console.error("Could not find the extension folder.\nSearched:\n" + candidates.map(p => " - " + p).join("\n") + "\n\nCreate the folder and include a manifest.json, e.g.:\n  extensions/chrome-quirra-overlay/manifest.json");
  process.exit(1);
}

const outDir = path.join(root, "dist");
await mkdir(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[^\d]/g, "").slice(0, 14);
const outZip = path.join(outDir, `quirra-overlay-${stamp}.zip`);

await zip(src, outZip);
console.log("Packed:", outZip);
