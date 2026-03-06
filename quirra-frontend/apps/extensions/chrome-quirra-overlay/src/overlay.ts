// extensions/chrome-quirra-overlay/src/overlay.ts

export type Scores = {
  duplication_pct: number;
  style_pct: number;
  risk: number;
  seen_count: number;
};

export type Neighbor = {
  event_id: string;
  when?: string;
  context?: string | null;
  url?: string | null;
  similarity?: number;
};

export class QuirraOverlay {
  private root: HTMLDivElement;
  private content: HTMLDivElement;
  private mounted = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey) document.documentElement.classList.add("quirra-alt");
  };
  private onKeyUp = () => {
    document.documentElement.classList.remove("quirra-alt");
  };

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "quirra-overlay";
    this.root.setAttribute("aria-live", "polite");

    this.content = document.createElement("div");
    this.content.className = "quirra-card";
    this.root.appendChild(this.content);
  }

  mount() {
    if (this.mounted) return;
    this.injectStyles();
    document.body.appendChild(this.root);
    this.mounted = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onKeyUp);
  }

  destroy() {
    if (!this.mounted) return;
    this.root.remove();
    document.documentElement.classList.remove("quirra-alt");
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onKeyUp);
    this.mounted = false;
  }

  showAnalyzing() {
    this.mount();
    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-row"><span class="qr-dot"></span><span>Analyzing…</span></div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
  }

  showError(msg = "Something went wrong") {
    this.mount();
    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-err">${escapeHtml(msg)}</div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
  }

  showPromptAnalyzing() {
    this.mount();
    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-row"><span class="qr-dot"></span><span>Analyzing prompt…</span></div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
  }

  showPromptResults(scores: Scores, suggestions: string[]) {
    this.mount();
    const riskCls =
      scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";

    const tips =
      suggestions?.length
        ? `<ul class="qr-list">${suggestions.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
        : `<div class="qr-sub">No suggestions — looks good</div>`;

    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-metrics">
        <div>Prompt risk: <b class="${riskCls}">${scores.risk}%</b>
          <span class="qr-sub"> · dup ${scores.duplication_pct}% · style ${scores.style_pct}%</span>
        </div>
      </div>
      <div class="qr-section">
        <div class="qr-title">Suggestions</div>
        ${tips}
      </div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
  }

  showResults(scores: Scores, neighbors: Neighbor[], labels?: string[]) {
    this.mount();
    const riskCls =
      scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";

    const list = neighbors
      .slice(0, 5)
      .map((n) => {
        const sim = n.similarity != null ? ` · sim ${(n.similarity * 100).toFixed(0)}%` : "";
        const ctx = n.context ? ` · ${escapeHtml(n.context)}` : "";
        const when = n.when ? ` · ${escapeHtml(timeAgo(n.when))}` : "";
        const ref = n.url
          ? ` · <a href="${escapeAttr(n.url)}" target="_blank" rel="noopener noreferrer">ref</a>`
          : "";
        return `<li>• ${escapeHtml(n.event_id.slice(0, 8))}${ctx}${when}${sim}${ref}</li>`;
      })
      .join("");

    const labelChips = (labels ?? [])
      .map((l) => {
        const cls = l.startsWith("risk:high")
          ? "qr-chip-red"
          : l.startsWith("risk:")
          ? "qr-chip-amber"
          : l.startsWith("duplicate:")
          ? "qr-chip-violet"
          : "qr-chip-default";
        return `<span class="qr-chip ${cls}">${escapeHtml(l)}</span>`;
      })
      .join("");

    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-metrics">
        <div>Risk: <b class="${riskCls}">${scores.risk}%</b>
          <span class="qr-sub"> · dup ${scores.duplication_pct}% · style ${scores.style_pct}% · seen ${scores.seen_count}</span>
        </div>
      </div>
      ${labelChips ? `<div class="qr-chips">${labelChips}</div>` : ""}
      ${
        neighbors.length
          ? `<div class="qr-section"><div class="qr-title">Near matches</div><ul class="qr-list">${list}</ul></div>`
          : `<div class="qr-section"><div class="qr-title">Near matches</div><div class="qr-sub">None found</div></div>`
      }
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
  }

  private injectStyles() {
    if (document.getElementById("quirra-overlay-styles")) return;
    const css = `
      .quirra-overlay { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; pointer-events: none; }
      html.quirra-alt .quirra-overlay { pointer-events: auto; }
      .quirra-card {
        min-width: 280px; max-width: min(380px, 92vw); border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.18); background: rgba(18,18,24,0.45);
        -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        color: #fff; padding: 10px 12px; font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        box-shadow: 0 10px 28px rgba(0,0,0,.35);
      }
      .qr-head { font-weight: 650; margin-bottom: 6px; font-size: 13px; letter-spacing: .2px; }
      .qr-row { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.85); }
      .qr-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.9); animation: qrPulse 1s infinite alternate; }
      @keyframes qrPulse { from { opacity: .25; } to { opacity: .9; } }
      .qr-hint { margin-top: 6px; font-size: 11px; color: rgba(255,255,255,.6); }
      .qr-err { color: #ffd166; }
      .qr-metrics { margin: 2px 0 6px 0; }
      .qr-sub { color: rgba(255,255,255,.6); }
      .qr-title { font-weight: 600; margin-bottom: 4px; }
      .qr-section { margin-top: 6px; }
      .qr-list { margin: 0; padding-left: 14px; color: rgba(255,255,255,.88); }
      .qr-green { color: #34d399; } .qr-amber { color: #f59e0b; } .qr-red { color: #f87171; }
      .quirra-card a { color: #a5b4fc; text-decoration: underline; }
      .qr-chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px 0; }
      .qr-chip { font-size: 11px; padding: 2px 7px; border-radius: 999px; border: 1px solid rgba(255,255,255,.15); }
      .qr-chip-red     { background: rgba(248,113,113,.15); color: #fca5a5; border-color: rgba(248,113,113,.3); }
      .qr-chip-amber   { background: rgba(245,158,11,.15);  color: #fcd34d; border-color: rgba(245,158,11,.3); }
      .qr-chip-violet  { background: rgba(167,139,250,.15); color: #c4b5fd; border-color: rgba(167,139,250,.3); }
      .qr-chip-default { background: rgba(255,255,255,.08); color: rgba(255,255,255,.8); }
    `;
    const el = document.createElement("style");
    el.id = "quirra-overlay-styles";
    el.textContent = css;
    document.head.appendChild(el);
  }
}

function escapeHtml(s: string) {
  return (s || "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)
  );
}
function escapeAttr(s: string) {
  return escapeHtml(s);
}
function timeAgo(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}