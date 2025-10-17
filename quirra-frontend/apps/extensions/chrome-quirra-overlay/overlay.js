// overlay.js
(function (global) {
  function escapeHtml(s) {
    return (s || "").replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]);
    });
  }
  function timeAgo(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  class QuirraOverlay {
    constructor() {
      this.root = document.createElement("div");
      this.root.className = "quirra-overlay";
      this.root.setAttribute("aria-live", "polite");
      this.content = document.createElement("div");
      this.content.className = "quirra-card";
      this.root.appendChild(this.content);
      this.mounted = false;
      this._onDown = (e) => {
        if (e.altKey) document.documentElement.classList.add("quirra-alt");
      };
      this._onUp = () => document.documentElement.classList.remove("quirra-alt");
    }
    mount() {
      if (this.mounted) return;
      this._injectStyles();
      document.body.appendChild(this.root);
      window.addEventListener("keydown", this._onDown);
      window.addEventListener("keyup", this._onUp);
      window.addEventListener("blur", this._onUp);
      this.mounted = true;
    }
    destroy() {
      if (!this.mounted) return;
      this.root.remove();
      document.documentElement.classList.remove("quirra-alt");
      window.removeEventListener("keydown", this._onDown);
      window.removeEventListener("keyup", this._onUp);
      window.removeEventListener("blur", this._onUp);
      this.mounted = false;
    }
    showAnalyzing() {
      this.mount();
      this.content.innerHTML = `<div class="qr-head">Quirra</div><div class="qr-row"><span class="qr-dot"></span><span>Analyzing…</span></div><div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
    }
    showPromptAnalyzing() {
      this.mount();
      this.content.innerHTML = `<div class="qr-head">Quirra</div><div class="qr-row"><span class="qr-dot"></span><span>Analyzing prompt…</span></div><div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
    }
    showPromptResults(scores, suggestions) {
      this.mount();
      const list = (suggestions || []).slice(0, 6).map(s => `<li>${escapeHtml(s)}</li>`).join("");
      const riskCls = (scores && scores.risk >= 75) ? "qr-red" : (scores && scores.risk >= 45) ? "qr-amber" : "qr-green";
      this.content.innerHTML = `<div class="qr-head">Quirra</div><div class="qr-metrics"><div>Risk: <b class="${riskCls}">${scores?.risk ?? "—"}%</b><span class="qr-sub"> · dup ${scores?.duplication_pct ?? "—"}% · style ${scores?.style_pct ?? "—"}%</span></div></div><div class="qr-section"><div class="qr-title">Suggestions</div><ul class="qr-list">${list || "<li>Try adding specifics: audience, examples, constraints.</li>"}</ul></div><div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
    }
    showResults(scores, neighbors) {
      this.mount();
      const riskCls = scores && scores.risk >= 75 ? "qr-red" : scores && scores.risk >= 45 ? "qr-amber" : "qr-green";
      const list = (neighbors || []).slice(0, 5).map(n => {
        const sim = n.similarity != null ? ` · sim ${(n.similarity * 100).toFixed(0)}%` : "";
        const ctx = n.context ? ` · ${escapeHtml(n.context)}` : "";
        const when = n.when ? ` · ${escapeHtml(timeAgo(n.when))}` : "";
        const ref = n.url ? ` · <a href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer">ref</a>` : "";
        return `<li>• ${escapeHtml((n.event_id || "").slice(0, 8))}${ctx}${when}${sim}${ref}</li>`;
      }).join("");
      this.content.innerHTML = `<div class="qr-head">Quirra</div><div class="qr-metrics"><div>Risk: <b class="${riskCls}">${scores?.risk ?? "—"}%</b><span class="qr-sub"> · dup ${scores?.duplication_pct ?? "—"}% · style ${scores?.style_pct ?? "—"}% · seen ${scores?.seen_count ?? 0}</span></div></div>${neighbors && neighbors.length ? `<div class="qr-section"><div class="qr-title">Near matches</div><ul class="qr-list">${list}</ul></div>` : `<div class="qr-section"><div class="qr-title">Near matches</div><div class="qr-sub">None found</div></div>`}<div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
    }
    showError(msg) {
      this.mount();
      this.content.innerHTML = `<div class="qr-head">Quirra</div><div class="qr-err"> ${escapeHtml(msg || "Something went wrong")}</div><div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
    }
    _injectStyles() {
      if (document.getElementById("quirra-overlay-styles")) return;
      const css = `.quirra-overlay { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; pointer-events: none; } html.quirra-alt .quirra-overlay { pointer-events: auto; } .quirra-card { min-width: 280px; max-width: min(380px, 92vw); border-radius: 14px; border: 1px solid rgba(255,255,255,0.18); background: rgba(18,18,24,0.45); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); color: #fff; padding: 10px 12px; font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; box-shadow: 0 10px 28px rgba(0,0,0,.35); } .qr-head { font-weight: 650; margin-bottom: 6px; font-size: 13px; letter-spacing: .2px; } .qr-row { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.85); } .qr-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.9); animation: qrPulse 1s infinite alternate; } @keyframes qrPulse { from { opacity: .25; } to { opacity: .9; } } .qr-hint { margin-top: 6px; font-size: 11px; color: rgba(255,255,255,.6); } .qr-err { color: #ffd166; } .qr-metrics { margin: 2px 0 6px 0; } .qr-sub { color: rgba(255,255,255,.6); } .qr-title { font-weight: 600; margin-bottom: 4px; } .qr-section { margin-top: 6px; } .qr-list { margin: 0; padding-left: 14px; color: rgba(255,255,255,.88); } .qr-green { color: #34d399; } .qr-amber { color: #f59e0b; } .qr-red { color: #f87171; } .quirra-card a { color: #a5b4fc; text-decoration: underline; }`;
      const el = document.createElement("style");
      el.id = "quirra-overlay-styles";
      el.textContent = css;
      document.head.appendChild(el);
    }
  }

  global.QuirraOverlay = QuirraOverlay;
})(window);
