import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

// Ensure build dir exists
mkdirSync("build/lib", { recursive: true });

// Bundle content.ts → single self-contained content.js (no imports)
await esbuild.build({
  entryPoints: ["src/content.ts"],
  bundle: true,
  outfile: "build/content.js",
  platform: "browser",
  target: "chrome110",
  format: "iife",   
});

await esbuild.build({
  entryPoints: ["src/overlay.ts"],
  bundle: true,
  outfile: "build/overlay.js",
  platform: "browser",
  target: "chrome110",
  format: "iife",
  sourcemap: false,
});

copyFileSync("manifest.json", "build/manifest.json");
copyFileSync("options.html",  "build/options.html");
copyFileSync("options.js",    "build/options.js");

console.log("Build complete.");