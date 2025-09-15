// quirra-frontend/apps/dashboard-next/src/lib/intsall-target.ts
import { CHROME_STORE_URL, EDGE_ADDONS_URL } from "@/lib/store-links";
import type { BrowserKind } from "@/lib/detect-browser";

const isGood = (u?: string) =>
  !!u &&
  /^https?:\/\//.test(u) &&
  !/\/detail\/error(?:\/|$)/.test(u) &&
  !/<your-/.test(u);

export type InstallTarget = { href: string; label: string; newTab?: boolean };

/**
 * Decide the best "Add to Browser" target based on detected browser family and env links.
 * Brave/Opera are routed via Chrome Web Store when present.
 */
export function resolveInstallTarget(browser: BrowserKind): InstallTarget {
  const chromeOk = isGood(CHROME_STORE_URL);
  const edgeOk = isGood(EDGE_ADDONS_URL);

  // Native Edge
  if (browser === "edge" && edgeOk) {
    return { href: EDGE_ADDONS_URL, label: "Add to Edge", newTab: true };
  }

  // Chrome-family: Chrome, Brave, Opera → Chrome Web Store
  if ((browser === "chrome" || browser === "brave" || browser === "opera") && chromeOk) {
    const label =
      browser === "brave"
        ? "Add to Brave (via Chrome Web Store)"
        : browser === "opera"
        ? "Add to Opera (via Chrome Web Store)"
        : "Add to Chrome";
    return { href: CHROME_STORE_URL, label, newTab: true };
  }

  // If user's browser isn't directly supported but one of the stores is configured,
  // prefer Chrome store, then Edge store.
  if (chromeOk) return { href: CHROME_STORE_URL, label: "Add to Chrome", newTab: true };
  if (edgeOk)   return { href: EDGE_ADDONS_URL,   label: "Add to Edge",   newTab: true };

  // Last resort: our manual install guide
  return { href: "/install", label: "Manual Install Guide" };
}
