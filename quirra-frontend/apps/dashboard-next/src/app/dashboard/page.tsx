// quirra-frontend/apps/dashboard-next/src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Copy,
  Activity,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

/** ---- Types ---- */
type Flag = {
  flag_id: string;
  event_id: string;
  severity: "low" | "med" | "high" | string;
  reasons?: string[];
  status?: string;
  created_at?: string;
};

/** ---- Helpers ---- */
const SEVERITY_COLORS: Record<string, string> = {
  high: "from-rose-500/60 to-rose-500/0 border-rose-400/50 text-rose-300",
  med: "from-amber-500/60 to-amber-500/0 border-amber-400/50 text-amber-200",
  low: "from-emerald-500/60 to-emerald-500/0 border-emerald-400/50 text-emerald-200",
};

const BADGE_BG: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300 border border-rose-400/40",
  med: "bg-amber-500/15 text-amber-200 border border-amber-400/40",
  low: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40",
};

function trimId(id: string, n = 10) {
  if (!id) return "";
  if (id.length <= n * 2 + 1) return id;
  return `${id.slice(0, n)}…${id.slice(-n)}`;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function riskNumber(sev: string) {
  const s = (sev || "").toLowerCase();
  if (s === "high") return 0.85;
  if (s === "med") return 0.5;
  return 0.2; // low/unknown
}

/** ---- Page ---- */
export default function Dashboard() {
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quirra.baseUrl") || "/api/quirra";
    }
    return "/api/quirra";
  });
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quirra.autoRefresh") === "1";
    }
    return false;
  });

  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadFlags() {
    try {
      setLoading(true);
      const r = await fetch(`${baseUrl}/v1/flags`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json().catch(() => []);
      setFlags(Array.isArray(data) ? (data as Flag[]) : []);
    } catch (e: any) {
      toast.error("Failed to load flags", { description: e?.message || "Network error" });
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    localStorage.setItem("quirra.baseUrl", baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    localStorage.setItem("quirra.autoRefresh", autoRefresh ? "1" : "0");
  }, [autoRefresh]);

  useEffect(() => {
    loadFlags();
  }, []); // initial load

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadFlags, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, baseUrl]);

  /** ---- Derived stats ---- */
  const { total, high, med, low, avgRisk } = useMemo(() => {
    const total = flags.length;
    const high = flags.filter((f) => (f.severity || "").toLowerCase() === "high").length;
    const med = flags.filter((f) => (f.severity || "").toLowerCase() === "med").length;
    const low = flags.filter((f) => (f.severity || "").toLowerCase() === "low").length;
    const avgRisk =
      total === 0
        ? 0
        : Math.round(
            (flags.reduce((acc, f) => acc + riskNumber(f.severity || "low"), 0) / total) * 100
          );
    return { total, high, med, low, avgRisk };
  }, [flags]);

  return (
    <div className="grid gap-6">
      {/* Top: Welcome & quick actions */}
      <motion.section
        className="grid gap-4 rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-5 backdrop-blur"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Provenance Dashboard</h2>
            <p className="text-sm text-[color:var(--muted)]">
              A quick look at originality checks and guardrail flags from your browsing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadFlags}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-hover)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? "Refreshing…" : "Refresh"}
            </button>

            <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border border-[var(--card-border)] bg-white/5 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-[var(--btn)]"
              />
              Auto-refresh
            </label>
          </div>
        </div>

        {/* Connection settings (friendly) */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <Settings2 className="h-4 w-4" />
            Backend (proxy base)
          </div>
          <div className="flex gap-2">
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-[var(--btn)] data-[theme=light]:bg-white/80"
              placeholder="/api/quirra"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(baseUrl);
                toast.success("Copied backend URL");
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--card-border)] bg-white/5 px-3 text-sm hover:bg-white/10"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
        </div>
      </motion.section>

      {/* Stats strip */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total Flags"
          value={total.toString()}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="High Severity"
          value={high.toString()}
          accent="high"
        />
        <StatCard label="Medium Severity" value={med.toString()} accent="med" />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Avg. Risk"
          value={`${avgRisk}%`}
        />
      </section>

      {/* Tips / Explainer */}
      <section className="rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 text-[color:var(--muted)]" />
          <div className="text-sm text-[color:var(--muted)]">
            <b>What am I seeing?</b> Each card below is a moment Quirra flagged a potential issue—
            duplication/near-match, risk hints, or policy labels. Click copy on the event ID to
            share with your team when needed.
          </div>
        </div>
      </section>

      {/* Flags list */}
      <section className="grid gap-3">
        {flags.length === 0 ? (
          <EmptyState />
        ) : (
          flags.map((f) => <FlagCard key={f.flag_id} f={f} />)
        )}
      </section>
    </div>
  );
}

/** ---- UI bits ---- */
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "low" | "med" | "high";
}) {
  const border =
    accent === "high"
      ? "border-rose-400/40"
      : accent === "med"
      ? "border-amber-400/40"
      : accent === "low"
      ? "border-emerald-400/40"
      : "border-[var(--card-border)]";

  return (
    <motion.div
      className={`rounded-xl border ${border} bg-[color:var(--card)] p-4`}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </motion.div>
  );
}

function FlagCard({ f }: { f: Flag }) {
  const sev = (f.severity || "low").toLowerCase();
  const grad = SEVERITY_COLORS[sev] || SEVERITY_COLORS.low;
  const badge = BADGE_BG[sev] || BADGE_BG.low;

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-[color:var(--card)]"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25 }}
    >
      {/* severity accent */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${grad}`} />
      <div className="relative grid gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-lg px-2.5 py-1 text-xs uppercase ${badge}`}>{sev}</span>

          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
            {f.created_at ? <span>{timeAgo(f.created_at)}</span> : null}
            {f.status ? <span>· {f.status}</span> : null}
          </div>
        </div>

        {/* Event ID with copy */}
        <div className="flex items-center gap-2">
          <code className="rounded bg-black/30 px-2 py-1 text-[13px]">
            {trimId(f.event_id)}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(f.event_id);
              toast.success("Event ID copied");
            }}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>

        {/* Reasons */}
        {(f.reasons?.length ?? 0) > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {f.reasons!.map((r, i) => (
              <span
                key={i}
                className="rounded-full border border-[var(--card-border)] bg-white/10 px-2.5 py-1 text-xs text-white/90"
              >
                {r}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[color:var(--muted)]">No reasons provided.</div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--card-border)] bg-[color:var(--card)] p-6 text-[color:var(--muted)]">
      <div className="text-base font-medium text-white/90">No flags yet 🎉</div>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Open your favorite AI tool and try a few prompts—Quirra will watch in the background.</li>
        <li>Look for the glass panel at the bottom-right; hold <b>Alt</b> to interact.</li>
        <li>
          Want to verify the connection? Visit <code className="rounded bg-white/10 px-1.5 py-0.5">/install</code> for
          a quick checklist.
        </li>
      </ul>
      <div className="pt-2">
        <a
          href="/install"
          className="inline-flex items-center rounded-xl bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-hover)]"
        >
          Set up the Overlay
        </a>
      </div>
    </div>
  );
}
