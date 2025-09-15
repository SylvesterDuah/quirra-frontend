"use client";
import { useEffect, useState } from "react";
import CopyButton from "@/components/copy-button";
import { detectBrowser, type BrowserKind } from "@/lib/detect-browser";
import { CHROME_STORE_URL, EDGE_ADDONS_URL } from "@/lib/store-links";

const valid = (u?: string) => !!u && /^https?:\/\//.test(u) && !/<your-/.test(u);

export default function InstallPage() {
  const backend = "http://127.0.0.1:8000";
  const [browser, setBrowser] = useState<BrowserKind>("other");
  useEffect(() => setBrowser(detectBrowser()), []);

  const showChrome = valid(CHROME_STORE_URL);
  const showEdge   = valid(EDGE_ADDONS_URL);

  return (
    <div className="grid gap-6">
      {/* Store install */}
      <section className="grid gap-4 rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-6">
        <h2 className="text-xl font-semibold">Install Quirra</h2>
        <p className="text-[color:var(--muted)]">
          Quirra is a <b>browser extension</b> that overlays your AI tools. Use the store links below to add it in one click.
        </p>

        <div className="flex flex-wrap gap-3">
          {showChrome && (
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-hover)]"
            >
              Add to Chrome
            </a>
          )}
          {showEdge && (
            <a
              href={EDGE_ADDONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[var(--card-border)] bg-[color:var(--card)] px-4 py-2 hover:bg-white/10"
            >
              Add to Edge
            </a>
          )}
        </div>

        {!showChrome && !showEdge && (
          <div className="rounded-xl border border-[var(--card-border)] bg-black/20 p-3 text-sm text-[color:var(--muted)]">
            Store links are not configured. Add them in <code>.env.local</code> or in <code>store-links.ts</code>.
          </div>
        )}
      </section>

      {/* Developer install (local) — safe: no chrome:// links from the site */}
      <section className="grid gap-3 rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-6">
        <div className="font-semibold">Developer install (local)</div>
        <ol className="list-decimal space-y-2 pl-6 text-[color:var(--muted)]">
          <li>
            Open your extensions page and paste into the address bar:{" "}
            <code className="rounded bg-white/10 px-2 py-0.5 text-sm">
              {browser === "edge" ? "edge://extensions" : "chrome://extensions"}
            </code>{" "}
            <CopyButton text={browser === "edge" ? "edge://extensions" : "chrome://extensions"} />
          </li>
          <li>Enable <b>Developer mode</b>.</li>
          <li>
            Click <b>Load unpacked</b> and select:
            <div className="mt-1">
              <code className="rounded bg-white/10 px-2 py-0.5 text-sm">Quirra-web/extensions/chrome-quirra-overlay</code>
            </div>
          </li>
          <li>
            In extension <b>Options</b>, set{" "}
            <span className="whitespace-nowrap">Backend URL:{" "}
              <code className="rounded bg-white/10 px-2 py-0.5 text-sm">{backend}</code>
            </span>{" "}
            <CopyButton text={backend} />
          </li>
          <li>Optionally set <code className="rounded bg-white/10 px-2 py-0.5 text-sm">X-Quirra-Secret</code> if your backend enforces it.</li>
          <li>The overlay appears bottom-right on AI sites; hold <b>Alt</b> to interact.</li>
        </ol>
        <div className="text-xs text-[color:var(--muted)]">
          The overlay intentionally excludes localhost so it won’t modify this dashboard.
        </div>
      </section>

      {/* Platform note */}
      <section className="rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--muted)]">
        Mobile, Desktop, and macOS app <b>coming soon</b>.
      </section>
    </div>
  );
}
