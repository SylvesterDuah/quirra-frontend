// extensions/chrome-quirra-overlay/src/overlay.ts

import type { DuplicateAlert } from "./lib/api";

export type Scores = {
  duplication_pct: number;
  style_pct:       number;
  risk:            number;
  seen_count:      number;
};

export type Neighbor = {
  event_id:    string;
  when?:       string;
  context?:    string | null;
  url?:        string | null;
  similarity?: number;
};

type State = "full" | "compact" | "minimized";

export class QuirraOverlay {
  private root:    HTMLDivElement;
  private bubble:  HTMLDivElement;
  private card:    HTMLDivElement;
  private body:    HTMLDivElement;
  private slider:  HTMLInputElement;
  private mounted  = false;
  private state:   State = "full";
  private opacity  = 0.85;

  constructor() {
    // ── Root ──────────────────────────────────────────────────────────────
    this.root = document.createElement("div");
    this.root.className = "qr-root";

    // ── Minimized Q bubble ────────────────────────────────────────────────
    this.bubble = document.createElement("div");
    this.bubble.className = "qr-bubble";
    this.bubble.innerHTML = `<span class="qr-bubble-q">Q</span>`;
    this.bubble.title = "Expand Quirra";
    this.bubble.addEventListener("click", () => this.setState("full"));

    // ── Card ──────────────────────────────────────────────────────────────
    this.card = document.createElement("div");
    this.card.className = "qr-card";

    // Header with controls
    const header = document.createElement("div");
    header.className = "qr-header";
    header.innerHTML = `
      <span class="qr-title">Quirra</span>
      <div class="qr-controls">
        <button class="qr-btn" data-action="opacity" title="Transparency">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm0 2a7 7 0 0 1 0 14V5z"/></svg>
        </button>
        <button class="qr-btn" data-action="resize" title="Compact/Full">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h16v2H4zm0 6h16v2H4z"/></svg>
        </button>
        <button class="qr-btn qr-btn-min" data-action="minimize" title="Minimize to Q">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
        </button>
      </div>
    `;

    // Wire controls
    header.querySelector(".qr-controls")!.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === "minimize") this.setState("minimized");
      if (action === "resize")   this.setState(this.state === "compact" ? "full" : "compact");
      if (action === "opacity")  this.slider.classList.toggle("qr-hidden");
    });

    this.makeDraggable(header);

    // Opacity slider
    this.slider = document.createElement("input");
    this.slider.type      = "range";
    this.slider.min       = "20";
    this.slider.max       = "98";
    this.slider.value     = String(Math.round(this.opacity * 100));
    this.slider.className = "qr-opacity-slider qr-hidden";
    this.slider.addEventListener("input", () => {
      this.opacity = Number(this.slider.value) / 100;
      this.card.style.background = `rgba(14,14,20,${this.opacity})`;
    });

    // Body
    this.body = document.createElement("div");
    this.body.className = "qr-body";

    this.card.appendChild(header);
    this.card.appendChild(this.slider);
    this.card.appendChild(this.body);

    this.root.appendChild(this.bubble);
    this.root.appendChild(this.card);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  mount() {
    if (this.mounted) return;
    this.injectStyles();
    document.body.appendChild(this.root);
    this.mounted = true;
    this.applyState();
  }

  destroy() {
    if (!this.mounted) return;
    this.root.remove();
    this.mounted = false;
  }

  showPromptResults(scores: Scores, suggestions: string[], isPreview: boolean) {
    this.mount();
    this.setBubbleRisk(scores.risk, false);
    const badge = isPreview ? `<span class="qr-badge">live</span>` : "";
    this.body.innerHTML = `
      <div class="qr-metrics">
        <span class="qr-lsm">RISK</span>
        <b class="${rc(scores.risk)}">${scores.risk}%</b>
        <span class="qr-muted"> · style ${scores.style_pct}%</span>
        ${badge}
      </div>
      <div class="qr-section">
        <div class="qr-lbl">Suggestions</div>
        <ul class="qr-list">${suggestions.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
    `;
  }

  showResults(scores: Scores, neighbors: Neighbor[], labels: string[], isPreview: boolean) {
    this.mount();
    this.setBubbleRisk(scores.risk, false);
    const badge  = isPreview ? `<span class="qr-badge">refining…</span>` : "";
    const chips  = labels.map(l => `<span class="qr-chip ${cc(l)}">${esc(l)}</span>`).join("");
    const neighs = neighbors.slice(0, 5).map(n => {
      const sim  = n.similarity != null ? ` · ${(n.similarity * 100).toFixed(0)}%` : "";
      const when = n.when ? ` · ${ago(n.when)}` : "";
      const ref  = n.url ? ` <a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">↗</a>` : "";
      return `<li>${esc(n.event_id.slice(0, 8))}${when}${sim}${ref}</li>`;
    }).join("");

    this.body.innerHTML = `
      <div class="qr-metrics">
        <span class="qr-lsm">RISK</span>
        <b class="${rc(scores.risk)}">${scores.risk}%</b>
        <span class="qr-muted"> · dup ${scores.duplication_pct}% · style ${scores.style_pct}% · seen ${scores.seen_count}</span>
        ${badge}
      </div>
      ${chips ? `<div class="qr-chips">${chips}</div>` : ""}
      <div class="qr-section">
        <div class="qr-lbl">Near matches</div>
        ${neighs
          ? `<ul class="qr-list">${neighs}</ul>`
          : `<span class="qr-muted">${isPreview ? "Checking…" : "None found"}</span>`}
      </div>
    `;
  }

  showDuplicateAlert(scores: Scores, alert: DuplicateAlert) {
    this.mount();
    this.setState("full"); // Force open
    this.setBubbleRisk(scores.risk, true);

    const firstSeen  = alert.first_seen
      ? `<div class="qr-dm">First seen: <b>${new Date(alert.first_seen).toLocaleDateString()}</b></div>`
      : "";
    const sourceLink = alert.source_url
      ? `<div class="qr-dm">Source: <a href="${esc(alert.source_url)}" target="_blank" rel="noopener noreferrer">${esc(shortUrl(alert.source_url))}</a></div>`
      : "";

    this.body.innerHTML = `
      <div class="qr-dup-banner">
        <div class="qr-dup-icon">⚠</div>
        <div>
          <div class="qr-dup-title">Response seen before</div>
          <div class="qr-dup-msg">${esc(alert.message)}</div>
          <div class="qr-dup-stats">
            <span class="qr-dup-stat qr-red">${alert.similarity}% match</span>
            <span class="qr-dup-stat">Seen ${alert.seen_count}×</span>
          </div>
          ${firstSeen}${sourceLink}
        </div>
      </div>
      <div class="qr-section" style="margin-top:8px">
        <div class="qr-metrics">
          <span class="qr-lsm">RISK</span>
          <b class="${rc(scores.risk)}">${scores.risk}%</b>
          <span class="qr-muted"> · style ${scores.style_pct}%</span>
        </div>
      </div>
    `;
  }

  appendNote(msg: string) {
    if (!this.mounted) return;
    let el = this.body.querySelector(".qr-note") as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.className = "qr-note";
      this.body.appendChild(el);
    }
    el.textContent = `⚠ ${msg}`;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private setState(s: State) {
    this.state = s;
    this.applyState();
  }

  private applyState() {
    const min = this.state === "minimized";
    this.bubble.style.display = min ? "flex"   : "none";
    this.card.style.display   = min ? "none"   : "flex";
    this.card.classList.toggle("qr-compact", this.state === "compact");
  }

  private setBubbleRisk(risk: number, isDup: boolean) {
    this.bubble.className = isDup
      ? "qr-bubble qr-bubble-dup"
      : risk >= 70 ? "qr-bubble qr-bubble-red"
      : risk >= 40 ? "qr-bubble qr-bubble-amber"
      : "qr-bubble qr-bubble-green";
  }

  private makeDraggable(handle: HTMLElement) {
    let sx = 0, sy = 0, sr = 16, sb = 16, drag = false;
    handle.style.cursor = "grab";
    handle.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest("button")) return;
      drag = true;
      sx = e.clientX; sy = e.clientY;
      const r = this.root.getBoundingClientRect();
      sr = window.innerWidth  - r.right;
      sb = window.innerHeight - r.bottom;
      handle.style.cursor = "grabbing";
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!drag) return;
      this.root.style.right  = `${Math.max(0, sr + (sx - e.clientX))}px`;
      this.root.style.bottom = `${Math.max(0, sb + (sy - e.clientY))}px`;
    });
    document.addEventListener("mouseup", () => {
      if (!drag) return;
      drag = false;
      handle.style.cursor = "grab";
    });
  }

  private injectStyles() {
    if (document.getElementById("quirra-styles")) return;
    const s = document.createElement("style");
    s.id = "quirra-styles";
    s.textContent = `
      /* Root */
      .qr-root{position:fixed;right:16px;bottom:16px;z-index:2147483646;font-family:system-ui,-apple-system,sans-serif;user-select:none}

      /* Q Bubble */
      .qr-bubble{width:36px;height:36px;border-radius:50%;background:rgba(14,14,20,.88);border:1.5px solid rgba(255,255,255,.18);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4);transition:transform .15s,box-shadow .15s}
      .qr-bubble:hover{transform:scale(1.12)}
      .qr-bubble-q{color:#fff;font-size:15px;font-weight:700;letter-spacing:-.5px}
      .qr-bubble-green{border-color:rgba(52,211,153,.65);box-shadow:0 0 0 2px rgba(52,211,153,.2)}
      .qr-bubble-amber{border-color:rgba(245,158,11,.65);box-shadow:0 0 0 2px rgba(245,158,11,.2)}
      .qr-bubble-red{border-color:rgba(248,113,113,.65);box-shadow:0 0 0 2px rgba(248,113,113,.2)}
      .qr-bubble-dup{border-color:rgba(248,113,113,.85);animation:qrBubblePulse 1s ease-in-out infinite}
      @keyframes qrBubblePulse{0%,100%{box-shadow:0 0 0 3px rgba(248,113,113,.35)}50%{box-shadow:0 0 0 7px rgba(248,113,113,.08)}}

      /* Card */
      .qr-card{display:flex;flex-direction:column;min-width:260px;max-width:min(340px,88vw);border-radius:14px;background:rgba(14,14,20,.85);border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#f0f0f4;font-size:12px;line-height:1.5;box-shadow:0 12px 32px rgba(0,0,0,.45);overflow:hidden}
      .qr-card.qr-compact .qr-body{display:none}
      .qr-card.qr-compact{min-width:180px}

      /* Header */
      .qr-header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 6px;border-bottom:1px solid rgba(255,255,255,.07);cursor:grab}
      .qr-header:active{cursor:grabbing}
      .qr-title{font-size:12px;font-weight:650;letter-spacing:.2px}

      /* Controls */
      .qr-controls{display:flex;gap:2px}
      .qr-btn{width:20px;height:20px;border-radius:5px;border:none;background:transparent;color:rgba(255,255,255,.45);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .12s,color .12s}
      .qr-btn:hover{background:rgba(255,255,255,.1);color:#fff}
      .qr-btn-min:hover{background:rgba(248,113,113,.2);color:#fca5a5}

      /* Slider */
      .qr-opacity-slider{width:calc(100% - 20px);margin:0 10px 6px;accent-color:#6366f1;height:3px;cursor:pointer}
      .qr-hidden{display:none!important}

      /* Body */
      .qr-body{padding:8px 10px 10px;max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}

      /* Elements */
      .qr-metrics{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:5px}
      .qr-lsm{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px}
      .qr-muted{color:rgba(255,255,255,.45)}
      .qr-section{margin-top:5px}
      .qr-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:rgba(255,255,255,.4);margin-bottom:4px}
      .qr-list{margin:0;padding-left:14px;color:rgba(255,255,255,.88)}
      .qr-list li{margin-bottom:3px}
      .qr-note{margin-top:6px;font-size:10px;color:#f59e0b;border-top:1px solid rgba(255,255,255,.07);padding-top:5px}
      .qr-green{color:#34d399}.qr-amber{color:#f59e0b}.qr-red{color:#f87171}
      .qr-card a{color:#93c5fd}

      /* Badge */
      .qr-badge{font-size:9px;padding:1px 6px;border-radius:999px;background:rgba(99,102,241,.25);color:#a5b4fc;border:1px solid rgba(99,102,241,.3);animation:qrPulse 1.4s ease-in-out infinite alternate}
      @keyframes qrPulse{from{opacity:.4}to{opacity:1}}

      /* Chips */
      .qr-chips{display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 5px}
      .qr-chip{font-size:10px;padding:1px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.1)}
      .qr-chip-red{background:rgba(248,113,113,.15);color:#fca5a5;border-color:rgba(248,113,113,.28)}
      .qr-chip-amber{background:rgba(245,158,11,.15);color:#fcd34d;border-color:rgba(245,158,11,.28)}
      .qr-chip-violet{background:rgba(167,139,250,.15);color:#c4b5fd;border-color:rgba(167,139,250,.28)}
      .qr-chip-grey{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6)}

      /* Duplicate banner */
      .qr-dup-banner{display:flex;gap:9px;align-items:flex-start;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);border-radius:10px;padding:9px 10px}
      .qr-dup-icon{font-size:15px;flex-shrink:0;margin-top:1px}
      .qr-dup-title{font-weight:650;font-size:12px;color:#fca5a5;margin-bottom:2px}
      .qr-dup-msg{font-size:11px;color:rgba(255,255,255,.85);line-height:1.4}
      .qr-dup-stats{display:flex;gap:6px;margin-top:5px;flex-wrap:wrap}
      .qr-dup-stat{font-size:10px;padding:1px 7px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
      .qr-dm{font-size:10px;color:rgba(255,255,255,.5);margin-top:4px}
      .qr-dm a{color:#fca5a5}
      .qr-dm b{color:rgba(255,255,255,.8)}
    `;
    document.head.appendChild(s);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rc(r: number) { return r >= 70 ? "qr-red" : r >= 40 ? "qr-amber" : "qr-green"; }
function cc(l: string) {
  if (l.startsWith("risk:high"))  return "qr-chip-red";
  if (l.startsWith("risk:"))      return "qr-chip-amber";
  if (l.startsWith("duplicate:")) return "qr-chip-violet";
  return "qr-chip-grey";
}
function esc(s: string) {
  return (s || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!));
}
function ago(iso?: string) {
  if (!iso) return "";
  const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function shortUrl(url: string) {
  try { const u = new URL(url); return u.hostname; } catch { return url.slice(0, 30); }
}