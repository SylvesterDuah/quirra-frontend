// apps/extensions/chrome-quirra-overlay/build.mjs
import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

mkdirSync("build", { recursive: true });

const shared = {
  bundle:    true,
  platform:  "browser",
  target:    "chrome110",
  format:    "iife",
  sourcemap: false,
};

// Bundle content script — must be IIFE (no import/export) for content scripts
await esbuild.build({
  ...shared,
  entryPoints: ["src/content.ts"],
  outfile:     "build/content.js",
});

// Bundle background service worker (keepalive)
await esbuild.build({
  ...shared,
  entryPoints: ["src/keepalive.ts"],
  outfile:     "build/keepalive.js",
});

// Copy static files
for (const f of ["manifest.json", "options.html", "options.js"]) {
  copyFileSync(f, `build/${f}`);
}

console.log("✓ Build complete");