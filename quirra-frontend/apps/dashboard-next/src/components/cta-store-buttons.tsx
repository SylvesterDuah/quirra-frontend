// quirra-frontend/apps/dashboard-next/src/components/cta-store-buttons.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { detectBrowser, type BrowserKind } from "@/lib/detect-browser";
import { resolveInstallTarget } from "@/lib/install-target";
import { CHROME_STORE_URL, EDGE_ADDONS_URL } from "@/lib/store-links";

const valid = (u?: string) => !!u && /^https?:\/\//.test(u);

type Badge = {
  id: BrowserKind;
  label: string;
  store?: "chrome" | "edge" | "coming";
};

export default function CtaStoreButtons() {
  const [browser, setBrowser] = useState<BrowserKind>("other");
  useEffect(() => setBrowser(detectBrowser()), []);

  const primary = useMemo(() => resolveInstallTarget(browser), [browser]);

  // Build parade list (detected browser first)
  const badges: Badge[] = useMemo(() => {
    const arr: Badge[] = [
      { id: "chrome",     label: "Chrome",     store: valid(CHROME_STORE_URL) ? "chrome" : "coming" },
      { id: "edge",       label: "Edge",       store: valid(EDGE_ADDONS_URL) ? "edge"   : "coming" },
      { id: "brave",      label: "Brave",      store: valid(CHROME_STORE_URL) ? "chrome" : "coming" },
      { id: "opera",      label: "Opera",      store: valid(CHROME_STORE_URL) ? "chrome" : "coming" },
      { id: "firefox",    label: "Firefox",    store: "coming" },
      { id: "safari",     label: "Safari",     store: "coming" },
      { id: "duckduckgo", label: "DuckDuckGo", store: "coming" },
    ];
    const idx = arr.findIndex((b) => b.id === browser);
    if (idx > 0) {
      const [hit] = arr.splice(idx, 1);
      arr.unshift(hit);
    }
    return arr;
  }, [browser]);

  return (
    <div className="grid gap-4">
      {/* Primary action */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={primary.href}
          {...(primary?.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="rounded-xl bg-[var(--btn)] px-4 py-2 text-white shadow hover:bg-[var(--btn-hover)]"
        >
          {primary.label}
        </a>

        {/* Optional direct store links */}
        {valid(CHROME_STORE_URL) && (
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--card-border)] bg-[color:var(--card)] px-4 py-2 hover:bg-white/10"
          >
            Chrome Web Store
          </a>
        )}
        {valid(EDGE_ADDONS_URL) && (
          <a
            href={EDGE_ADDONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--card-border)] bg-[color:var(--card)] px-4 py-2 hover:bg-white/10"
          >
            Edge Add-ons
          </a>
        )}
      </div>

      {/* Animated browser parade */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-[color:var(--card)] p-3">
        <div className="mb-2 text-xs uppercase tracking-wide text-[color:var(--muted)]">
          Your browser & other supported browsers
        </div>

        {/* Highlighted detected browser (static, animated in) */}
        <div className="mb-3 flex items-center gap-2">
          <motion.div
            layout
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-white/10 px-3 py-1.5"
            style={{
              boxShadow:
                "0 0 0 2px rgba(79,70,229,0.22), 0 8px 28px rgba(0,0,0,0.25)",
            }}
            aria-live="polite"
          >
            <span style={{ color: brandColor(browser) }}>
              <BrowserIcon kind={browser} className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">{labelOf(browser)} detected</span>
          </motion.div>
        </div>

        {/* Parade line */}
        <motion.div
          className="flex gap-2"
          initial={{ x: 0 }}
          animate={{ x: ["0%", "-25%", "0%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          {badges.map((b, i) => (
            <motion.a
              key={b.id + i}
              href={hrefFor(b)}
              target={targetFor(b)}
              rel={relFor(b)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-white/5 px-3 py-1.5 text-[13px] hover:bg-white/10"
              style={{ opacity: b.id === browser ? 0.95 : 0.75 }}
              whileHover={{ scale: 1.03 }}
            >
              <span style={{ color: brandColor(b.id) }}>
                <BrowserIcon kind={b.id} className="h-4 w-4" />
              </span>
              <span>{b.label}</span>
              <span className="text-xs text-[color:var(--muted)]">
                {badgeHint(b)}
              </span>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ------------ helpers ------------ */

function labelOf(kind: BrowserKind) {
  switch (kind) {
    case "chrome": return "Chrome";
    case "edge": return "Edge";
    case "brave": return "Brave";
    case "opera": return "Opera";
    case "firefox": return "Firefox";
    case "safari": return "Safari";
    case "duckduckgo": return "DuckDuckGo";
    default: return "Your browser";
  }
}

function hrefFor(b: { id: BrowserKind; store?: "chrome" | "edge" | "coming" }) {
  if (b.store === "chrome" && valid(CHROME_STORE_URL)) return CHROME_STORE_URL;
  if (b.store === "edge" && valid(EDGE_ADDONS_URL)) return EDGE_ADDONS_URL;
  return "/install"; // only used for “coming soon”/guide; header already has main guide link
}
function targetFor(b: { store?: "chrome" | "edge" | "coming" }) {
  return b.store === "coming" ? undefined : "_blank";
}
function relFor(b: { store?: "chrome" | "edge" | "coming" }) {
  return b.store === "coming" ? undefined : "noopener noreferrer";
}
function badgeHint(b: { store?: "chrome" | "edge" | "coming"; id: BrowserKind }) {
  if (b.store === "chrome" && (b.id === "opera" || b.id === "brave")) return "via Chrome Web Store";
  if (b.store === "chrome") return "store";
  if (b.store === "edge") return "store";
  return "guide";
}

/** Subtle brand tints (used as currentColor on icons) */
function brandColor(kind: BrowserKind) {
  switch (kind) {
    case "chrome": return "#5BB974";
    case "edge": return "#19A4D6";
    case "brave": return "#FB542B";
    case "opera": return "#FF1B2D";
    case "firefox": return "#FF7139";
    case "safari": return "#0FB5EE";
    case "duckduckgo": return "#DE5833";
    default: return "currentColor";
  }
}

/* Minimal inline SVG icons (use currentColor for easy tinting) */
function BrowserIcon({
  kind,
  className,
}: {
  kind: BrowserKind;
  className?: string;
}) {
  const base = "fill-current";
  switch (kind) {
    case "chrome":
    case "brave":
    case "opera":
      return (
        <svg viewBox="0 0 24 24" className={`${base} ${className || ""}`} aria-hidden="true">
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "edge":
      return (
        <svg viewBox="0 0 24 24" className={`${base} ${className || ""}`} aria-hidden="true">
          <path d="M4 12a8 8 0 0116 0c0 4.418-3.134 7-7 7-3 0-4-2-4-3 0-1.5 1.2-2.5 3-2.5 1.2 0 2.3.5 3 .5 1 0 2-.5 2-2a5 5 0 00-10 0H4z" />
        </svg>
      );
    case "firefox":
      return (
        <svg viewBox="0 0 24 24" className={`${base} ${className || ""}`} aria-hidden="true">
          <path d="M12 3c4.97 0 9 4.03 9 9 0 4.418-3.582 8-8 8H8a6 6 0 110-12 4 4 0 014-4z" />
        </svg>
      );
    case "safari":
      return (
        <svg viewBox="0 0 24 24" className={`${base} ${className || ""}`} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 5l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
        </svg>
      );
    case "duckduckgo":
      return (
        <svg viewBox="0 0 24 24" className={`${base} ${className || ""}`} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 10c2-1 4-1 8 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={`${base} ${className || ""}`} aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="3" />
        </svg>
      );
  }
}
