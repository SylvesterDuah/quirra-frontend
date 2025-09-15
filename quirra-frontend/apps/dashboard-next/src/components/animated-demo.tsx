// quirra-frontend/apps/dashboard-next/src/components/animated-demo.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Eye,
  Workflow,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

/**
 * Animated, self-contained demo:
 * 1) Simulated "Add to Browser"
 * 2) User typing a prompt on a generic AI page
 * 3) Quirra glass overlay analyzes
 * 4) Uniqueness & provenance summary (hard-coded sample)
 * All visuals are local; no external links are opened.
 */
export default function AnimatedDemo() {
  const prefersReduced = usePrefersReducedMotion();

  // ----- Scripted flow
  const prompt =
    "Draft a landing page for a neighborhood restaurant — make it warm, original, and not generic.";

  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "analyzing" | "results">("typing");

  const [isInstalled, setInstalled] = useState(false);
  const [isInstalling, setInstalling] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Metrics that animate up when results appear
  const [risk, setRisk] = useState(0);
  const [dup, setDup] = useState(0);
  const [style, setStyle] = useState(0);
  const [seen, setSeen] = useState(0);

  // ----- Typing simulation
  useEffect(() => {
    if (phase !== "typing") return;
    let i = 0;
    const step = () => {
      setTyped(prompt.slice(0, i));
      i++;
      if (i <= prompt.length) {
        typeTimer.current = window.setTimeout(step, prefersReduced ? 0 : 22);
      } else {
        // when finished typing, if already installed, auto-analyze
        stageTimer.current = window.setTimeout(
          () => isInstalled && setPhase("analyzing"),
          prefersReduced ? 0 : 380
        );
      }
    };
    step();
    return cleanupTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prefersReduced, isInstalled]);

  // ----- analyzing → results
  useEffect(() => {
    if (phase !== "analyzing") return;
    stageTimer.current = window.setTimeout(
      () => setPhase("results"),
      prefersReduced ? 0 : 650
    );
    return cleanupTimers;
  }, [phase, prefersReduced]);

  // ----- animate metrics in results
  useEffect(() => {
    if (phase !== "results") return;
    const target = { risk: 18, dup: 12, style: 20, seen: 3 };
    animateNumber(setRisk, target.risk, prefersReduced);
    animateNumber(setDup, target.dup, prefersReduced);
    animateNumber(setStyle, target.style, prefersReduced);
    animateNumber(setSeen, target.seen, prefersReduced);
    return cleanupTimers;
  }, [phase, prefersReduced]);

  // ----- Install button logic
  const onInstall = () => {
    if (isInstalled || isInstalling) return;
    setInstalling(true);
    stageTimer.current = window.setTimeout(() => {
      setInstalling(false);
      setInstalled(true);
      setShowToast(true);
      timers.current.push(
        window.setTimeout(() => setShowToast(false), prefersReduced ? 800 : 2200)
      );
      if (typed.length === prompt.length && phase === "typing") {
        stageTimer.current = window.setTimeout(
          () => setPhase("analyzing"),
          prefersReduced ? 0 : 320
        );
      }
    }, prefersReduced ? 0 : 600);
  };

  // ----- timers
  const timers = useRef<number[]>([]);
  const typeTimer = useRef<number | null>(null);
  const stageTimer = useRef<number | null>(null);
  function cleanupTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (typeTimer.current) clearTimeout(typeTimer.current);
    if (stageTimer.current) clearTimeout(stageTimer.current);
  }
  function animateNumber(setter: (n: number) => void, target: number, reduced: boolean) {
    if (reduced) {
      setter(target);
      return;
    }
    let v = 0;
    const tick = () => {
      v += Math.max(1, Math.ceil((target - v) * 0.25));
      setter(Math.min(target, v));
      if (v < target) timers.current.push(window.setTimeout(tick, 55));
    };
    tick();
  }

  // ----- styles
  const cardCn = "rounded-xl border border-[var(--card-border)] bg-[color:var(--card)]";
  const chromeCn =
    "flex items-center gap-2 border-b border-[var(--card-border)] bg-black/20 px-3 py-2 text-xs text-[color:var(--muted)]";
  const insetShadow =
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_25px_rgba(0,0,0,0.25)]";

  return (
    <section className={`${cardCn} overflow-hidden ${insetShadow}`}>
      {/* Fake browser chrome */}
      <div className={chromeCn}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="mx-2 h-6 flex-1 rounded-md border border-[var(--card-border)] bg-white/5 px-2.5 text-[11px] leading-6">
          ai-site.example
        </div>

        {!isInstalled ? (
          <button
            onClick={onInstall}
            className="rounded-md border border-[var(--card-border)] bg-[var(--btn)] px-3 py-1 text-white transition-opacity disabled:opacity-60"
            disabled={isInstalling}
          >
            {isInstalling ? "Installing…" : "Add to Browser"}
          </button>
        ) : (
          <span className="rounded-md border border-[var(--card-border)] bg-white/5 px-2 py-1">
            Quirra · ON
          </span>
        )}
      </div>

      {/* Demo body */}
      <div className="relative grid gap-4 p-4 sm:p-5">
        {/* Conversation */}
        <div className="grid gap-2">
          <div className="w-fit max-w-[82%] rounded-lg border border-[var(--card-border)] bg-white/5 px-3 py-2 text-sm text-[color:var(--muted)]">
            Hello! What would you like to make today?
          </div>
          <div className="w-fit max-w-[82%] rounded-lg border border-[var(--card-border)] bg-[var(--btn)]/15 px-3 py-2 text-sm text-[color:var(--fg)]">
            {typed}
            {phase === "typing" && <Cursor />}
          </div>
        </div>

        {/* Input bar */}
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white/5 px-3 py-2">
          <div className="flex-1 truncate text-sm text-[color:var(--muted)]">
            {typed.length === 0 ? "Type your prompt…" : typed}
          </div>
          <div className="rounded-md border border-[var(--card-border)] bg-[var(--btn)]/10 px-2 py-1 text-xs text-[color:var(--fg)]">
            Enter
          </div>
        </div>

        {/* Quirra overlay (glass) */}
        <AnimatePresence>
          {isInstalled && (phase === "analyzing" || phase === "results") && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: prefersReduced ? 0 : 0.24 }}
              className="pointer-events-none absolute bottom-4 right-4 w-[min(360px,92%)]"
            >
              <div
                className="rounded-xl border border-white/20 bg-[rgba(18,18,24,0.35)] p-3 text-[13px] text-white/90 backdrop-blur"
                style={{ boxShadow: "0 14px 40px rgba(0,0,0,.35)" }}
              >
                <div className="mb-1.5 text-[13px] font-semibold">Quirra</div>

                {phase === "analyzing" && (
                  <div className="flex items-center gap-2 text-white/75">
                    <Dot className="animate-pulse" /> Analyzing prompt…
                  </div>
                )}

                {phase === "results" && (
                  <div className="space-y-1.5">
                    <div>
                      Risk:{" "}
                      <b
                        className={
                          risk > 75 ? "text-red-400" : risk > 45 ? "text-amber-300" : "text-emerald-400"
                        }
                      >
                        {risk}%
                      </b>{" "}
                      <span className="text-white/60">
                        · dup: {dup}% · style: {style}% · seen: {seen}
                      </span>
                    </div>
                    <div className="text-white/80">
                      Suggestions: add specifics • vary sentence length • cite sources
                    </div>
                    <div className="text-[11px] text-white/60">Hold <b>Alt</b> to interact</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Install confirmation toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: prefersReduced ? 0 : 0.2 }}
              className="pointer-events-none absolute bottom-4 left-4"
            >
              <div className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-black/40 px-3 py-2 text-sm text-white/90 backdrop-blur">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Quirra added to your browser
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uniqueness & provenance (hard-coded sample, educates users) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-[var(--card-border)] bg-black/20 p-4 text-sm"
        >
          <div className="text-[12px] uppercase tracking-wide text-[color:var(--muted)] mb-2">
            Uniqueness & provenance
          </div>
          <div className="text-white/90">
            This response (or near-match) has appeared <b>3</b> times.
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/85">
            <li><b>Who</b>: anonymized user #A1 (public post), #A2, #A3</li>
            <li><b>When</b>: 2d ago · 5d ago · 2w ago</li>
            <li><b>Context</b>: “course essay outline” · “blog SEO brief” · “team memo”</li>
            <li className="flex items-center gap-1">
              <b>Reference</b>: public copy available
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-white/5 px-1.5 py-0.5 text-xs">
                View sample <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </li>
          </ul>
          <div className="mt-2 text-[12px] text-[color:var(--muted)]">
            Private data is never exposed. Public references only when available & appropriate.
          </div>
        </motion.div>

        {/* Legend / What Quirra checks */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {legend.map((l) => (
            <div
              key={l.title}
              className="rounded-lg border border-[var(--card-border)] bg-white/5 px-3 py-2 text-xs text-[color:var(--muted)]"
            >
              <div className="mb-1 flex items-center gap-2 text-[color:var(--fg)]">
                <span className="grid h-6 w-6 place-items-center rounded-md border border-[var(--card-border)] bg-white/10">
                  {l.icon}
                </span>
                <b className="text-[12px]">{l.title}</b>
              </div>
              <div>{l.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* small visual bits */
function Cursor() {
  return <span className="ml-0.5 inline-block h-[1.1em] w-[1px] align-[-2px] bg-current opacity-70" />;
}
function Dot(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className="inline-block h-2 w-2 rounded-full bg-white/80 align-middle" />;
}

/* legend tiles */
const legend = [
  { icon: <Eye className="h-4 w-4" />,          title: "Non-blocking UI",  text: "See-through panel that never covers your work." },
  { icon: <ShieldCheck className="h-4 w-4" />,   title: "Prompt guardrails", text: "Catches vague asks, unfair framing, risky intent." },
  { icon: <Sparkles className="h-4 w-4" />,      title: "Response checks",  text: "Detects sameness & style fingerprints." },
  { icon: <Workflow className="h-4 w-4" />,      title: "Humanized edits",  text: "Concrete phrasing changes you can copy." },
];

/* accessibility: reduced motion */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  const mql = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    mql.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(!!mql.current?.matches);
    apply();
    mql.current.addEventListener?.("change", apply);
    return () => mql.current?.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}
