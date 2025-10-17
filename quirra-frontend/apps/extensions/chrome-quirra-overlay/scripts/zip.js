// quirra-frontend/apps/extensions/chrome-quirra-overlay/scripts/zip.js

// ESM script (package.json has "type":"module")
import { zip } from "zip-a-folder";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");                  // .../chrome-quirra-overlay
const buildDir = path.join(root, "build");                   // tsc output (see tsconfig)
const packDir  = path.join(root, "pack");                    // staging dir
const outZip   = path.join(root, "quirra-overlay.zip");      // final zip at package root

async function main() {
  // sanity check: build exists
  try {
    await fs.access(buildDir);
  } catch {
    console.error(`Missing build output at: ${buildDir}. Run "npm run build" first.`);
    process.exit(1);
  }

  // clean & re-create staging
  await fs.rm(packDir, { recursive: true, force: true });
  await fs.mkdir(packDir, { recursive: true });

  // copy manifest.json (required at zip root)
  await fs.copyFile(path.join(root, "manifest.json"), path.join(packDir, "manifest.json"));

  // copy options.html if you have one
  try {
    await fs.copyFile(path.join(root, "options.html"), path.join(packDir, "options.html"));
  } catch {}

  // copy icons/ if present
  try {
    await fs.cp(path.join(root, "icons"), path.join(packDir, "icons"), { recursive: true });
  } catch {}

  // copy compiled JS/CSS/etc from build
  await fs.cp(buildDir, path.join(packDir, "build"), { recursive: true });

  // make the zip
  await zip(packDir, outZip);

  console.log("Packed:", outZip.replace(/\\/g, "/"));
}

main().catch((e) => {
  console.error("Pack failed:", e);
  process.exit(1);
});
