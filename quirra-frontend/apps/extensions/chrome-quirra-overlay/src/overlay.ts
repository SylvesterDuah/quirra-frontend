// extensions/chrome-quirra-overlay/src/overlay.ts

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

export class QuirraOverlay {
  private root:    HTMLDivElement;
  private card:    HTMLDivElement;
  private mounted  = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey) document.documentElement.classList.add("quirra-alt");
  };
  private onKeyUp = () => document.documentElement.classList.remove("quirra-alt");

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "quirra-root";
    this.card = document.createElement("div");
    this.card.className = "quirra-card";
    this.root.appendChild(this.card);
  }

  mount() {
    if (this.mounted) return;
    this.injectStyles();
    document.body.appendChild(this.root);
    this.mounted = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup",   this.onKeyUp);
    window.addEventListener("blur",    this.onKeyUp);
  }

  destroy() {
    if (!this.mounted) return;
    this.root.remove();
    document.documentElement.classList.remove("quirra-alt");
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup",   this.onKeyUp);
    window.removeEventListener("blur",    this.onKeyUp);
    this.mounted = false;
  }

  // ── Public render methods ─────────────────────────────────────────────────

  /** Called instantly with local scores as the user types. */
  showPromptResults(scores: Scores, suggestions: string[], isPreview: boolean) {
    this.mount();
    const riskCls = riskClass(scores.risk);
    const badge   = isPreview ? `<span class="qr-badge">live</span>` : "";

    this.card.innerHTML = `
      <div class="qr-head">Quirra ${badge}</div>
      <div class="qr-metrics">
        Risk <b class="${riskCls}">${scores.risk}%</b>
        <span class="qr-muted"> · style ${scores.style_pct}%</span>
      </div>
      <div class="qr-section">
        <div class="qr-label">Suggestions</div>
        <ul class="qr-list">
          ${suggestions.map(s => `<li>${esc(s)}</li>`).join("")}
        </ul>
      </div>
      <div class="qr-hint">Hold <kbd>Alt</kbd> to interact</div>
    `;
  }

  /** Called instantly with local scores when a response appears. */
  showResults(scores: Scores, neighbors: Neighbor[], labels: string[], isPreview: boolean) {
    this.mount();
    const riskCls   = riskClass(scores.risk);
    const badge     = isPreview ? `<span class="qr-badge">live · refining…</span>` : "";
    const chipHtml  = labels.map(l => `<span class="qr-chip ${chipCls(l)}">${esc(l)}</span>`).join("");
    const neighHtml = neighbors.slice(0, 5).map(n => {
      const sim  = n.similarity != null ? ` · ${(n.similarity * 100).toFixed(0)}% sim` : "";
      const when = n.when ? ` · ${timeAgo(n.when)}` : "";
      const ref  = n.url  ? ` <a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">↗</a>` : "";
      return `<li>${esc(n.event_id.slice(0, 8))}${when}${sim}${ref}</li>`;
    }).join("");

    this.card.innerHTML = `
      <div class="qr-head">Quirra ${badge}</div>
      <div class="qr-metrics">
        Risk <b class="${riskCls}">${scores.risk}%</b>
        <span class="qr-muted"> · dup ${scores.duplication_pct}% · style ${scores.style_pct}% · seen ${scores.seen_count}</span>
      </div>
      ${chipHtml  ? `<div class="qr-chips">${chipHtml}</div>` : ""}
      <div class="qr-section">
        <div class="qr-label">Near matches</div>
        ${neighHtml
          ? `<ul class="qr-list">${neighHtml}</ul>`
          : `<div class="qr-muted">${isPreview ? "Checking…" : "None found"}</div>`}
      </div>
      <div class="qr-hint">Hold <kbd>Alt</kbd> to interact</div>
    `;
  }

  /** Appends a small non-blocking backend note without wiping local results. */
  appendNote(msg: string) {
    if (!this.mounted) return;
    let el = this.card.querySelector(".qr-note") as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.className = "qr-note";
      this.card.appendChild(el);
    }
    el.textContent = `⚠ ${msg}`;
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  private injectStyles() {
    if (document.getElementById("quirra-styles")) return;
    const s = document.createElement("style");
    s.id = "quirra-styles";
    s.textContent = `
      .quirra-root {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        pointer-events: none; font-family: system-ui, -apple-system, sans-serif;
      }
      html.quirra-alt .quirra-root { pointer-events: auto; }

      .quirra-card {
        min-width: 260px; max-width: min(360px, 90vw);
        padding: 10px 12px; border-radius: 14px;
        background: rgba(14, 14, 20, 0.62);
        border: 1px solid rgba(255,255,255,0.14);
        backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        color: #f0f0f4; font-size: 12px; line-height: 1.5;
        box-shadow: 0 12px 32px rgba(0,0,0,.45);
      }

      .qr-head {
        font-size: 13px; font-weight: 650; margin-bottom: 5px;
        display: flex; align-items: center; gap: 6px;
      }
      .qr-badge {
        font-size: 10px; font-weight: 500; padding: 1px 7px;
        border-radius: 999px; background: rgba(99,102,241,.28);
        color: #a5b4fc; border: 1px solid rgba(99,102,241,.35);
        animation: qrFade 1.4s ease-in-out infinite alternate;
      }
      @keyframes qrFade { from { opacity: .5; } to { opacity: 1; } }

      .qr-metrics  { margin-bottom: 5px; }
      .qr-muted    { color: rgba(255,255,255,.52); }
      .qr-section  { margin-top: 5px; }
      .qr-label    { font-weight: 600; margin-bottom: 3px; font-size: 11px; color: rgba(255,255,255,.7); }
      .qr-list     { margin: 0; padding-left: 14px; color: rgba(255,255,255,.88); }
      .qr-list li  { margin-bottom: 2px; }
      .qr-hint     { margin-top: 7px; font-size: 10px; color: rgba(255,255,255,.4); }
      .qr-hint kbd { background: rgba(255,255,255,.1); border-radius: 3px; padding: 0 3px; }
      .qr-note     { margin-top: 6px; font-size: 10px; color: #f59e0b;
                     border-top: 1px solid rgba(255,255,255,.08); padding-top: 5px; }

      .qr-green { color: #34d399; }
      .qr-amber { color: #f59e0b; }
      .qr-red   { color: #f87171; }

      .quirra-card a { color: #93c5fd; }

      .qr-chips { display: flex; flex-wrap: wrap; gap: 3px; margin: 5px 0; }
      .qr-chip  { font-size: 10px; padding: 1px 7px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); }
      .qr-chip-red    { background: rgba(248,113,113,.15); color: #fca5a5; border-color: rgba(248,113,113,.3); }
      .qr-chip-amber  { background: rgba(245,158,11,.15);  color: #fcd34d; border-color: rgba(245,158,11,.3); }
      .qr-chip-violet { background: rgba(167,139,250,.15); color: #c4b5fd; border-color: rgba(167,139,250,.3); }
      .qr-chip-grey   { background: rgba(255,255,255,.07); color: rgba(255,255,255,.7); }
    `;
    document.head.appendChild(s);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function riskClass(r: number) {
  return r >= 70 ? "qr-red" : r >= 40 ? "qr-amber" : "qr-green";
}

function chipCls(label: string) {
  if (label.startsWith("risk:high"))   return "qr-chip-red";
  if (label.startsWith("risk:"))       return "qr-chip-amber";
  if (label.startsWith("duplicate:"))  return "qr-chip-violet";
  return "qr-chip-grey";
}

function esc(s: string) {
  return (s || "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)
  );
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}