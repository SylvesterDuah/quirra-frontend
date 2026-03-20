// apps/extensions/chrome-quirra-overlay/build.mjs
import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";

mkdirSync("build", { recursive: true });

const shared = {
  bundle:    true,
  platform:  "browser",
  target:    "chrome110",
  format:    "iife",
  sourcemap: false,
};

// Main content script
await esbuild.build({
  ...shared,
  entryPoints: ["src/content.ts"],
  outfile:     "build/content.js",
});
console.log("✓ content.js built");

// Background keepalive (optional)
if (existsSync("src/keepalive.ts")) {
  await esbuild.build({
    ...shared,
    entryPoints: ["src/keepalive.ts"],
    outfile:     "build/keepalive.js",
  });
  console.log("✓ keepalive.js built");
}

// Copy static files
for (const f of ["manifest.json", "options.html", "options.js"]) {
  if (existsSync(f)) {
    copyFileSync(f, `build/${f}`);
    console.log(`✓ copied ${f}`);
  } else {
    console.warn(`⚠ skipped ${f} (not found)`);
  }
}

console.log("✓ Build complete");