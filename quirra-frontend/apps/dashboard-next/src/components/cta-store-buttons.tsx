// quirra-frontend/apps/dashboard-next/src/components/cta-store-buttons.tsx
"use client";

import Link from "next/link";

const CHROME = process.env.NEXT_PUBLIC_CHROME_WEBSTORE_URL || "";
const EDGE = process.env.NEXT_PUBLIC_EDGE_ADDONS_URL || "";

export default function CtaStoreButtons() {
  const hasChrome = !!CHROME;
  const hasEdge = !!EDGE;

  if (!hasChrome && !hasEdge) {
    return (
      <Link
        href="/install"
        className="inline-flex items-center justify-center rounded-xl bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-hover)]"
      >
        Add to Browser
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {hasChrome && (
        <a
          href={CHROME}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Get on Chrome Web Store
        </a>
      )}
      {hasEdge && (
        <a
          href={EDGE}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Get on Microsoft Edge Add-ons
        </a>
      )}
    </div>
  );
}
