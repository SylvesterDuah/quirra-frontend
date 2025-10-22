// content.js — Quirra overlay content script (final)
const DEFAULT_BACKEND = "https://quirra-api.onrender.com";
const DEFAULT_SECRET = "";

// ====== tiny settings helpers ======
async function getSettings() {
  try {
    const v = await chrome.storage.sync.get({ backend: "", secret: "" });
    const backend = ((v.backend || "").trim() || DEFAULT_BACKEND).replace(/\/+$/, "");
    const secret = (v.secret || "").trim() || DEFAULT_SECRET;
    return { backend, secret };
  } catch (e) {
    console.debug("Quirra: storage.get failed, using defaults", e);
    return { backend: DEFAULT_BACKEND, secret: DEFAULT_SECRET };
  }
}

function isPublicUrl(href) {
  try {
    const u = new URL(href);
    return ["http:", "https:"].includes(u.protocol) && u.hostname !== "localhost";
  } catch { return false; }
}
function inferContext(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("essay") || t.includes("assignment")) return "course essay";
  if (t.includes("blog") || t.includes("seo")) return "blog brief";
  if (t.includes("memo") || t.includes("update")) return "team memo";
  if (t.includes("outline")) return "outline";
  return "general";
}
async function getStableBrowserId() {
  const key = "quirra_browser_id";
  try {
    const existing = await chrome.storage.local.get(key);
    if (existing && existing[key]) return String(existing[key]);
    const id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
    await chrome.storage.local.set({ [key]: id });
    return id;
  } catch (e) {
    console.debug("Quirra: storage.local unavailable, fallback id", e);
    return (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
  }
}

// ====== backend API helpers ======
async function safeJson(res) {
  const ct = res && res.headers ? (res.headers.get("content-type") || "") : "";
  try {
    if (ct.includes("application/json")) return await res.json();
    // try parse anyway for leniency
    return await res.json();
  } catch (e) {
    try { return { _rawText: await res.text(), _status: res.status, _ok: res.ok }; } catch { return null; }
  }
}

async function hashUserServerSide(userId) {
  const { backend, secret } = await getSettings();
  const url = `${backend}/api/v1/hash`;
  console.debug("Quirra: calling hash endpoint", url, { userId });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    body: JSON.stringify({ user_id: userId })
  });
  const j = await safeJson(r);
  console.debug("Quirra: hash response", r.status, j);
  if (!r.ok) {
    const msg = j?.detail || j?._rawText || `Hash failed: ${r.status}`;
    throw new Error(msg);
  }
  if (!j || !j.user_hash) throw new Error("Hash returned unexpected payload");
  return j.user_hash;
}

async function postEvent(payload) {
  const { backend, secret } = await getSettings();
  const url = `${backend}/api/v1/events`;
  console.debug("Quirra: postEvent ->", url, payload);
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    body: JSON.stringify(payload)
  });
  const j = await safeJson(r);
  console.debug("Quirra: postEvent response", r.status, j);
  if (!r.ok) throw new Error(j?.detail || j?._rawText || `Post failed: ${r.status}`);
  return j.event_id || j.id || j.event || null;
}

async function getAnalysis(eventId) {
  const { backend, secret } = await getSettings();
  const url = `${backend}/api/v1/events/${encodeURIComponent(eventId)}/analysis`;
  console.debug("Quirra: getAnalysis ->", url);
  const r = await fetch(url, {
    headers: { ...(secret ? { "X-Quirra-Secret": secret } : {}) }
  });
  const j = await safeJson(r);
  console.debug("Quirra: getAnalysis response", r.status, j);
  if (!r.ok) throw new Error(j?.detail || j?._rawText || `Analysis failed: ${r.status}`);
  return j;
}

// ====== overlay UI (transparent, draggable, closable) ======
class QuirraOverlay {
  constructor() {
    this.root = document.createElement("div");
    this.root.className = "quirra-overlay";
    this.root.setAttribute("aria-live", "polite");

    this.content = document.createElement("div");
    this.content.className = "quirra-card";

    this.header = document.createElement("div");
    this.header.className = "qr-header";
    this.header.innerHTML = `<span class="qr-handle" title="Drag">Quirra</span><button class="qr-close" title="Close">✕</button>`;

    this.body = document.createElement("div");
    this.body.className = "qr-body";
    this.body.innerHTML = `<div class="qr-row"><span class="qr-dot"></span><span>Ready</span></div>`;

    this.content.appendChild(this.header);
    this.content.appendChild(this.body);
    this.root.appendChild(this.content);

    this.mounted = false;
    this.dragging = false;
    this.offset = { x: 0, y: 0 };

    this._bindHandlers();
  }

  _bindHandlers() {
    const closeBtn = this.header.querySelector(".qr-close");
    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.hideTemporarily(); });

    const handle = this.header.querySelector(".qr-handle");
    handle.style.cursor = "grab";

    handle.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      this.dragging = true;
      try { handle.setPointerCapture(ev.pointerId); } catch {}
      const rect = this.content.getBoundingClientRect();
      this.offset.x = ev.clientX - rect.left;
      this.offset.y = ev.clientY - rect.top;
      handle.style.cursor = "grabbing";
    });

    window.addEventListener("pointermove", (ev) => {
      if (!this.dragging) return;
      this.mount();
      const x = Math.max(8, Math.min(window.innerWidth - this.content.offsetWidth - 8, ev.clientX - this.offset.x));
      const y = Math.max(8, Math.min(window.innerHeight - this.content.offsetHeight - 8, ev.clientY - this.offset.y));
      this.root.style.right = "auto";
      this.root.style.left = `${x}px`;
      this.root.style.top = `${y}px`;
      this.root.style.bottom = "auto";
    });

    window.addEventListener("pointerup", (ev) => {
      if (this.dragging) {
        this.dragging = false;
        handle.style.cursor = "grab";
        try { handle.releasePointerCapture && handle.releasePointerCapture(ev.pointerId); } catch {}
      }
    });

    this.content.addEventListener("mouseenter", () => this.content.classList.add("qr-hover"));
    this.content.addEventListener("mouseleave", () => this.content.classList.remove("qr-hover"));
  }

  mount() {
    if (this.mounted) return;
    this.injectStyles();
    document.body.appendChild(this.root);
    this.mounted = true;

    this.root.style.right = "18px";
    this.root.style.bottom = "18px";
    this.root.style.left = "auto";
    this.root.style.top = "auto";
  }

  destroy() {
    try { this.root.remove(); } catch (e) {}
    this.mounted = false;
  }

  hideTemporarily() {
    this.destroy();
  }

  showAnalyzing(label) {
    this.mount();
    this.body.innerHTML = `
      <div class="qr-row"><span class="qr-dot"></span><span>${label ? `Analyzing — ${escapeHtml(label)}` : "Analyzing…"}</span></div>
      <div class="qr-hint">Drag to move • Hover to reveal controls</div>
    `;
  }

  showPromptResults(scores, suggestions) {
    this.mount();
    const riskCls = scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";
    const sugList = (suggestions || []).map(s => `<li>• ${escapeHtml(s)}</li>`).join("") || "<li>• Looks good!</li>";
    this.body.innerHTML = `
      <div class="qr-metrics">Risk: <b class="${riskCls}">${scores.risk}%</b> <span class="qr-sub"> · style ${scores.style_pct}%</span></div>
      <div class="qr-section"><div class="qr-title">Suggestions</div><ul class="qr-list">${sugList}</ul></div>
    `;
  }

  showResults(scores, neighbors) {
    this.mount();
    const riskCls = scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";
    const list = (neighbors || []).slice(0,5).map(n => {
      const sim = n.similarity != null ? ` · sim ${(n.similarity*100).toFixed(0)}%` : "";
      const ctx = n.context ? ` · ${escapeHtml(n.context)}` : "";
      const when = n.when ? ` · ${escapeHtml(timeAgo(n.when))}` : "";
      const ref = n.url ? ` · <a href="${escapeAttr(n.url)}" target="_blank" rel="noopener noreferrer">ref</a>` : "";
      return `<li>• ${escapeHtml(String(n.event_id||"").slice(0,8))}${ctx}${when}${sim}${ref}</li>`;
    }).join("");
    this.body.innerHTML = `
      <div class="qr-metrics">Risk: <b class="${riskCls}">${scores.risk}%</b>
        <div class="qr-sub"> · dup ${scores.duplication_pct}% · style ${scores.style_pct}% · seen ${scores.seen_count}</div>
      </div>
      <div class="qr-section"><div class="qr-title">Near matches</div>${list ? `<ul class="qr-list">${list}</ul>` : `<div class="qr-sub">None found</div>`}</div>
    `;
  }

  showError(msg) {
    this.mount();
    this.body.innerHTML = `<div class="qr-err">${escapeHtml(msg || "Something went wrong")}</div>`;
  }

  showBackendNotConfigured() {
    this.mount();
    const url = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL("options.html") : "#";
    this.body.innerHTML = `
      <div class="qr-err">Backend URL not configured</div>
      <div class="qr-sub">Open <a href="${url}" target="_blank" rel="noopener noreferrer">options</a> to set it or contact the developer.</div>
    `;
  }

  injectStyles() {
    if (document.getElementById("quirra-overlay-styles")) return;
    const css = `
      .quirra-overlay { position: fixed; z-index: 2147483646; pointer-events: none; }
      .quirra-card { pointer-events: auto; }
      .quirra-card, .quirra-card * { box-sizing: border-box; }

      .quirra-card { min-width: 260px; max-width: min(420px, 92vw); border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(18,18,24,0.18);
        -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
        color: #fff; padding: 6px; font: 13px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 8px 28px rgba(0,0,0,0.28); pointer-events: auto;
      }

      .qr-header { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px; border-radius:8px; }
      .qr-handle { font-weight:600; user-select:none; padding:2px 6px; border-radius:6px; background:transparent; cursor:grab; }
      .qr-close { display:none; background:transparent; border:0; color:rgba(255,255,255,0.8); font-size:14px; cursor:pointer; padding:4px; border-radius:6px; }
      .quirra-card.qr-hover .qr-close { display:inline-flex; }

      .qr-body { padding:6px; }
      .qr-row { display:flex; align-items:center; gap:8px; color:rgba(255,255,255,0.9); }
      .qr-dot { width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.9); animation:qrPulse 1s infinite alternate; }
      @keyframes qrPulse{ from{opacity:.25} to{opacity:.9} }

      .qr-hint { margin-top:6px; font-size:11px; color:rgba(255,255,255,0.66); }
      .qr-err { color:#ffd166; }
      .qr-metrics { margin:4px 0; font-size:14px; }
      .qr-sub { color: rgba(255,255,255,0.7); font-size:12px; margin-top:6px; }
      .qr-title { font-weight:600; margin-bottom:4px; font-size:13px; }
      .qr-section { margin-top:8px; }
      .qr-list { margin:0; padding-left:16px; color:rgba(255,255,255,0.9); }
      .qr-green{color:#34d399}.qr-amber{color:#f59e0b}.qr-red{color:#f87171}
      .quirra-card a{ color:#a5b4fc; text-decoration:underline; }

      @media (max-width:520px) {
        .quirra-card { left:8px; right:8px; bottom:12px; max-width:calc(100% - 16px); }
      }
    `;
    const el = document.createElement("style");
    el.id = "quirra-overlay-styles";
    el.textContent = css;
    document.head.appendChild(el);
  }
}

function escapeHtml(s) { return String(s || "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;", '"':"&quot;" }[c])); }
function escapeAttr(s) { return escapeHtml(s); }

// ====== main watchers & logic ======
(function main() {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  const overlay = new QuirraOverlay();

  const PROMPT_SELECTOR = ['textarea', '[contenteditable="true"]', 'div[role="textbox"]'].join(",");
  const RESPONSE_SELECTORS = ['[data-testid="ai-response"]', '.assistant-message', '.response', '.ai-output'];

  async function immediateDetectAndMount() {
    const hasPrompt = !!document.querySelector(PROMPT_SELECTOR);
    const hasResponse = !!document.querySelector(RESPONSE_SELECTORS.join(","));
    if (hasPrompt || hasResponse) {
      overlay.mount();
      chrome.storage.sync.get({ backend: "" }, (v) => {
        if (!v.backend && (!DEFAULT_BACKEND || DEFAULT_BACKEND.trim() === "")) {
          overlay.showBackendNotConfigured();
        }
      });
    }
  }
  immediateDetectAndMount();

  const presenceObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        if (document.querySelector(PROMPT_SELECTOR) || document.querySelector(RESPONSE_SELECTORS.join(","))) {
          immediateDetectAndMount();
          break;
        }
      }
    }
  });
  presenceObserver.observe(document.documentElement, { childList: true, subtree: true });

  // prompt analysis
  let promptTimer = null;
  let lastPromptHash = "";
  const TYPING_DEBOUNCE = 220;

  function scheduleAnalyzePrompt(text) {
    if (!text || text.trim().length < 16) return;
    if (promptTimer) clearTimeout(promptTimer);
    promptTimer = setTimeout(() => void analyzePrompt(text), TYPING_DEBOUNCE);
  }

  document.addEventListener("input", (e) => {
    const t = e.target; if (!t || !t.matches?.(PROMPT_SELECTOR)) return; scheduleAnalyzePrompt(readText(t));
  }, { capture: true });

  document.addEventListener("keyup", (e) => {
    const t = e.target; if (!t || !t.matches?.(PROMPT_SELECTOR)) return; scheduleAnalyzePrompt(readText(t));
  }, { capture: true });

  async function analyzePrompt(text) {
    try {
      overlay.showAnalyzing("Prompt");
      const canon = text.replace(/\s+/g," ").trim().toLowerCase();
      const hash = simpleHash(canon);
      if (hash === lastPromptHash) return;
      lastPromptHash = hash;

      const stableId = await getStableBrowserId();
      const user_hash = await hashUserServerSide(stableId);
      const event_id = await postEvent({
        kind: "prompt",
        content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: false }
      });
      const ar = await getAnalysis(event_id);
      const scores = ar && ar.scores ? ar.scores : { risk: 0, style_pct: 0 };
      const suggestions = buildPromptSuggestions(text, scores);
      overlay.showPromptResults(scores, suggestions);
    } catch (err) {
      console.debug("Quirra: analyzePrompt error", err);
      overlay.showError(err?.message || "Prompt analysis failed");
    }
  }

  // response analysis
  let lastResponseSent = "";
  const mo = new MutationObserver(() => {
    const txt = getLatestResponse();
    if (txt && txt !== lastResponseSent) {
      lastResponseSent = txt;
      void analyzeResponse(txt);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  async function analyzeResponse(text) {
    try {
      overlay.showAnalyzing("Response");
      const stableId = await getStableBrowserId();
      const user_hash = await hashUserServerSide(stableId);
      const event_id = await postEvent({
        kind: "response",
        content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: isPublicUrl(location.href) }
      });
      const analysis = await waitForAnalysis(event_id, 8, 500);
      overlay.showResults(analysis && analysis.scores ? analysis.scores : { risk:0, duplication_pct:0, style_pct:0, seen_count:0 }, analysis && analysis.neighbors ? analysis.neighbors : []);
    } catch (err) {
      console.debug("Quirra: analyzeResponse error", err);
      overlay.showError(err?.message || "Response analysis failed");
    }
  }

  window.addEventListener("beforeunload", () => { mo.disconnect(); presenceObserver.disconnect(); overlay.destroy(); });

  // helpers
  function readText(el) { if (!el) return ""; if (typeof el.value === "string") return el.value; return el.innerText || el.textContent || ""; }
  function getLatestResponse() { for (const sel of RESPONSE_SELECTORS) { const nodes = Array.from(document.querySelectorAll(sel)); if (nodes.length) { const last = nodes[nodes.length-1]; const txt = (last.innerText || last.textContent || ""); if (txt.trim().length > 10) return txt.trim(); } } return ""; }
  function simpleHash(s) { let h=0; for (let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return String(h>>>0); }
  function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
  async function waitForAnalysis(id, tries=6, delayMs=600) { for (let i=0;i<tries;i++){ const r = await getAnalysis(id); if (!r || !r.status || r.status === "done") return r; await sleep(delayMs); } return await getAnalysis(id); }
  function buildPromptSuggestions(text, scores){ const s=[]; const t=(text||"").trim(); if (t.length<80) s.push("Add specifics: audience, domain, constraints, and examples."); if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective."); if (!/\bn\b|\bwords?\b|\bsteps?\b|\bformat\b|\bstyle\b/i.test(t)) s.push("Specify length, format, and writing style."); if (/\bjailbreak|\bbypass|\bignore\b.*(rules|instructions)/i.test(t)) s.push("Remove jailbreak cues or policy-bypassing language."); if ((scores?.style_pct||0) > 70) s.push("Vary sentence structure and avoid boilerplate phrases."); if (!s.length) s.push("Nice prompt. You can refine with target, style and constraints if needed."); return s; }
})();

function timeAgo(iso) { if(!iso) return ""; const then = new Date(iso).getTime(); if (Number.isNaN(then)) return ""; const diff = Math.max(0, Date.now() - then); const mins = Math.floor(diff/60000); if (mins<1) return "just now"; if (mins<60) return `${mins}m ago`; const hrs = Math.floor(mins/60); if (hrs<24) return `${hrs}h ago`; const days = Math.floor(hrs/24); return `${days}d ago`; }
