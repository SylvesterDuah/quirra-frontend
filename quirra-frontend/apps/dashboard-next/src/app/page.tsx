"use client";
import { motion } from "framer-motion";
import CtaStoreButtons from "@/components/cta-store-buttons";
import AnimatedDemo from "@/components/animated-demo";
import PoweredByCustos from "@/components/powered-by-custos";
import Aura from "@/components/Aura";


export default function Landing() {
  return (
    <div className="relative grid gap-12">
      <AuraBackdrop />

      {/* HERO — Provenance first */}
      <section className="relative grid gap-5 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-6 sm:p-8 backdrop-blur">
          <Aura />
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--card-border)] bg-white/5 px-3 py-1 text-xs text-[color:var(--muted)]">
          Browser Extension · Not a developer tool
        </div>

        <motion.h1
          className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Know if your AI answer has been{" "}
          <span className="relative inline-block">
            <ShimmerUnderline>generated before</ShimmerUnderline>
          </span>
        </motion.h1>

        <motion.p
          className="max-w-[880px] text-pretty text-[color:var(--muted)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
        >
          Quirra is a lightweight, see-through overlay that verifies <b>provenance</b> of AI-generated text on your screen.
          It flags exact or near-matches, shows <b>how many times</b> a response (or close variant) has appeared,
          <b> when</b> it was first/last seen, and—when publicly discoverable—provides <b>context</b> and <b>references</b>.
          Then it suggests small, human-sounding edits so your work stays truly <b>unique</b> and accountable.
          Quirra ensures your AI generated content is original to you only—no more copy-paste AI junk. We check everything you
          generate and give you control before it's too late.
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <CtaStoreButtons />
        </motion.div>

        {/* Provenance readout (illustrative UI) */}
        <div className="mt-4 grid gap-3 rounded-xl border border-[var(--card-border)] bg-black/25 p-4 shadow-inner">
          <div className="text-[11px] uppercase tracking-wide text-[color:var(--muted)]">Provenance Snapshot</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Chip label="Seen" value="23 times" />
            <Chip label="Similarity" value="92%" />
            <Chip label="First seen" value="May 2, 2025" />
            <Chip label="Last seen" value="2 hours ago" />
            <Chip label="Public refs" value="3" />
          </div>
          <div className="text-sm text-white/85">
            “Suggestions: add specifics about your dataset and intended audience. Replace generic phrasing with concrete nouns.”
          </div>
        </div>

        {/* Ambient orb tucked in the corner */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(99,102,241,.25), transparent 70%)", filter: "blur(20px)" }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </section>

      {/* Animated demo (hard-coded UI) */}
      <AnimatedDemo />

      {/* Why Quirra */}
      <section className="grid gap-4 md:grid-cols-2">
        <ValueCard
          title="Exact & near-match detection"
          text="We look beyond copy-paste duplicates. Quirra detects paraphrases and template-like outputs that are statistically close to known responses."
        />
        <ValueCard
          title="Frequency & timeline"
          text="See how often a response (or close one) has appeared, and when it first/last surfaced—so you can judge originality at a glance."
        />
        <ValueCard
          title="Context & public references"
          text="When matches are public, Quirra surfaces examples and context. Private content remains private—no screenshots, no page source export."
        />
        <ValueCard
          title="Privacy-first by design"
          text="On-page parsing only; you control the backend. Optional secret header, local exemptions, and transparent controls."
        />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-5 sm:p-6">
        <div className="mb-2 font-semibold">How it works</div>
        <ol className="list-decimal space-y-3 pl-6 text-[color:var(--muted)]">
          <li><b>Add the extension</b> — one-click from your browser’s store. The overlay sits bottom-right and never blocks typing.</li>
          <li><b>Type as usual</b> — Quirra passively reads your prompt and the on-page AI response to create a compact, privacy-respecting signature.</li>
          <li><b>Provenance checks</b> — we compare against known signatures to find exact/near matches, count occurrences, and build a first/last-seen timeline.</li>
          <li><b>Show references when allowed</b> — if matches are public on the web, we show links and short context; private or gated content stays hidden.</li>
          <li><b>Humanized edits</b> — Quirra proposes style and content changes to keep your result original while preserving intent.</li>
        </ol>

        {/* faint aura stripe behind list */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 bottom-3 h-24 rounded-full opacity-40"
          style={{ background: "radial-gradient(60% 200% at 50% 50%, rgba(16,185,129,.25), transparent 70%)", filter: "blur(18px)" }}
        />
      </section>

      {/* Supporting guardrails */}
      <section className="rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-5 sm:p-6">
        <div className="mb-2 font-semibold">Plus: gentle guardrails</div>
        <ul className="list-disc space-y-2 pl-6 text-[color:var(--muted)]">
          <li>Misalignment & misuse signals (jailbreak cues, unsafe asks, vague intent).</li>
          <li>Bias hints and style sameness to avoid repetitive, generic phrasing.</li>
          <li>Duplicate-prompt heuristics to help you ask better, once.</li>
        </ul>
      </section>

      <PoweredByCustos />

      <section className="rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--muted)]">
        Mobile, Desktop, and macOS app <b>coming soon</b>.
      </section>
    </div>
  );
}

/** --- tiny presentational helpers --- */
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-[var(--card-border)] bg-white/5 px-2.5 py-1 text-white/90">
      <span className="text-white/60">{label}:</span> <b>{value}</b>
    </span>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[color:var(--card)] p-4">
      <div className="mb-1 font-semibold">{title}</div>
      <div className="text-sm text-[color:var(--muted)]">{text}</div>
    </div>
  );
}

/* ---- Aura bits ---- */
function AuraBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* big soft radial */}
      <motion.div
        className="absolute left-1/2 top-[-160px] h-[420px] w-[640px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(99,102,241,.22), transparent 70%)", filter: "blur(24px)" }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.65, 0.9, 0.65] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* diagonal green glow */}
      <motion.div
        className="absolute right-[-140px] top-32 h-[320px] w-[320px] rotate-12 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(16,185,129,.18), transparent 70%)", filter: "blur(20px)" }}
        animate={{ y: [0, -12, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      {/* small violet orb */}
      <motion.div
        className="absolute left-[-120px] bottom-20 h-[220px] w-[220px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(168,85,247,.20), transparent 70%)", filter: "blur(18px)" }}
        animate={{ x: [0, 10, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
    </div>
  );
}

function ShimmerUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative">
      <span className="relative z-10 underline decoration-[var(--btn)] underline-offset-4">{children}</span>
      <motion.span
        aria-hidden
        className="absolute -inset-x-2 -bottom-1 h-[14px] rounded-full opacity-60"
        style={{
          background:
            "linear-gradient(90deg, rgba(99,102,241,.0), rgba(99,102,241,.25), rgba(16,185,129,.25), rgba(99,102,241,.0))",
          filter: "blur(8px)",
        }}
        animate={{ x: ["-25%", "100%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}
