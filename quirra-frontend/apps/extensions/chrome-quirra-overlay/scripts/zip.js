import { zip } from "zip-a-folder";
import { mkdirSync } from "node:fs";

mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
await zip(
  new URL("../src/", import.meta.url).pathname,
  new URL("../dist/chrome-quirra-overlay.zip", import.meta.url).pathname
);
console.log("Packed -> extensions/chrome-quirra-overlay/dist/chrome-quirra-overlay.zip");

