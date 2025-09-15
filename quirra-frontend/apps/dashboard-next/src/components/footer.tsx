"use client";
import { useEffect, useState } from "react";
import { detectBrowser, type BrowserKind } from "@/lib/detect-browser";
import { resolveInstallTarget } from "@/lib/install-target";

export default function Footer() {
  const [browser, setBrowser] = useState<BrowserKind>("other");
  useEffect(() => setBrowser(detectBrowser()), []);
  const install = resolveInstallTarget(browser);

  return (
    <footer className="mt-12 border-t border-[var(--card-border)]">
      <div className="container flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[color:var(--muted)]">
          © {new Date().getFullYear()} Quirra. All rights reserved.
        </div>
        <div>
          <h2>CUSTOS <span>LABS</span></h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={install.href}
            {...(install.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="rounded-lg border border-[var(--card-border)] bg-[color:var(--card)] px-3 py-1.5 hover:bg-white/10"
          >
            {install.label}
          </a>
          <a href="/dashboard" className="rounded-lg border border-[var(--card-border)] bg-[color:var(--card)] px-3 py-1.5 hover:bg-white/10">
            Dashboard
          </a>
          <a href="/privacy" className="rounded-lg border border-[var(--card-border)] bg-[color:var(--card)] px-3 py-1.5 hover:bg-white/10">
            Privacy
          </a>
          <a href="/terms" className="rounded-lg border border-[var(--card-border)] bg-[color:var(--card)] px-3 py-1.5 hover:bg-white/10">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
