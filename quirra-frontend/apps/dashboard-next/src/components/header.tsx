"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import ThemeToggle from "@/components/theme-toggle";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50",
        "border-b border-[var(--card-border)]",
        "bg-[color:var(--card)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--card)]/60"
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Taller header so the big logo fits nicely */}
        <div className="min-h-[72px] md:min-h-[92px] flex items-center justify-between">
          {/* Brand: BIG logo, switches by theme */}
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative block h-12 w-[220px] sm:h-16 sm:w-[280px] md:h-20 md:w-[340px]">
              {/* Light logo (shows in light) */}
              <Image
                src="/logo1.png"
                alt="Quirra"
                fill
                className="object-contain logo-light"
                priority
                sizes="(max-width: 640px) 220px, (max-width: 768px) 280px, 340px"
              />
              {/* Dark logo (shows in dark) */}
              <Image
                src="/logo2.png"
                alt="Quirra"
                fill
                className="object-contain logo-dark"
                priority
                sizes="(max-width: 640px) 220px, (max-width: 768px) 280px, 340px"
              />
            </span>
            <span className="sr-only">Quirra</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-[color:var(--muted)]">
            <Link href="/#how-it-works" className="hover:text-[color:var(--fg)]">
              How it works
            </Link>
            <Link href="/#features" className="hover:text-[color:var(--fg)]">
              Features
            </Link>
            <Link href="/install" className="hover:text-[color:var(--fg)]">
              Install
            </Link>
          </nav>

          {/* Right: Theme + CTA / Burger */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/install"
              className="hidden md:inline-flex rounded-xl bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-hover)]"
            >
              Add to Browser
            </Link>
            <button
              aria-label="Toggle menu"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--card-border)] bg-white/5"
              onClick={() => setOpen((s) => !s)}
            >
              <div className="relative h-5 w-5">
                <span className={clsx("absolute inset-x-0 top-0 h-0.5 bg-current transition-transform", open && "translate-y-2 rotate-45")} />
                <span className={clsx("absolute inset-x-0 top-2 h-0.5 bg-current transition-opacity", open && "opacity-0")} />
                <span className={clsx("absolute inset-x-0 top-4 h-0.5 bg-current transition-transform", open && "-translate-y-2 -rotate-45")} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={clsx("md:hidden transition-[max-height,opacity] overflow-hidden", open ? "max-h-64 opacity-100" : "max-h-0 opacity-0")}>
        <nav className="px-4 sm:px-6 lg:px-8 pb-4 grid gap-2 text-sm">
          <Link href="/#how-it-works" className="rounded-lg px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link href="/#features" className="rounded-lg px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
            Features
          </Link>
          <Link href="/install" className="rounded-lg px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
            Install
          </Link>
          <Link
            href="/install"
            className="mt-1 rounded-xl bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-hover)]"
            onClick={() => setOpen(false)}
          >
            Add to Browser
          </Link>
        </nav>
      </div>

      {/* Make theme switching global so only ONE logo shows */}
      <style jsx global>{`
        .logo-light { display: block; }
        .logo-dark { display: none; }

        html[data-theme="dark"] .logo-light { display: none !important; }
        html[data-theme="dark"] .logo-dark { display: block !important; }

        html[data-theme="light"] .logo-light { display: block !important; }
        html[data-theme="light"] .logo-dark { display: none !important; }

        /* If no explicit data-theme, follow system setting */
        @media (prefers-color-scheme: dark) {
          html:not([data-theme]) .logo-light { display: none !important; }
          html:not([data-theme]) .logo-dark { display: block !important; }
        }
        @media (prefers-color-scheme: light) {
          html:not([data-theme]) .logo-light { display: block !important; }
          html:not([data-theme]) .logo-dark { display: none !important; }
        }
      `}</style>
    </header>
  );
}
