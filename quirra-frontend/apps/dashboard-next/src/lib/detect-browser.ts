// quirra-frontend/apps/dashboard-next/src/lib/detect-browser.ts
export type BrowserKind =
  | "chrome"
  | "edge"
  | "firefox"
  | "safari"
  | "opera"
  | "brave"
  | "duckduckgo"
  | "other";

export function detectBrowser(ua?: string): BrowserKind {
  const raw = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  const s = raw.toLowerCase();

  // Brave detection
  try {
    if (typeof navigator !== "undefined") {
      // @ts-expect-error Nonstandard property exposed by Brave
      if (navigator.brave) {
        // @ts-expect-error isBrave exists on Brave; truthiness is enough here
        if (navigator.brave.isBrave) return "brave";
      }
    }
  } catch {}

  if (s.includes("duckduckgo")) return "duckduckgo";
  if (s.includes("edg/"))      return "edge";
  if (s.includes("opr/") || s.includes("opera")) return "opera";
  if (s.includes("firefox/"))  return "firefox";
  if (s.includes("safari/") && !s.includes("chrome") && !s.includes("crios")) return "safari";
  if (s.includes("chrome/") || s.includes("crios/")) return "chrome";

  return "other";
}
