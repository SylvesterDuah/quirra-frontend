"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch {}
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  // Fallback to system preference
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      aria-label="Toggle theme"
      aria-pressed={theme === "dark"}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--card-border)] bg-white/5 hover:bg-white/10"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        /* Moon icon */
        <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
        /* Sun icon */
        <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current">
          <path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79 1.8-1.79zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zm9-10v-2h-3v2h3zm-2.24-8.16l-1.79 1.79 1.8 1.79 1.79-1.79-1.8-1.79zM12 6a6 6 0 100 12A6 6 0 0012 6zm7.24 12.36l1.8 1.79 1.79-1.79-1.79-1.8-1.8 1.8zM4.84 18.24l-1.79 1.8 1.79 1.79 1.79-1.79-1.79-1.8z" />
        </svg>
      )}
    </button>
  );
}
