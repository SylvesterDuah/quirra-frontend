"use strict";
(() => {
  // src/lib/api.ts
  async function getSettings() {
    const v = await chrome.storage.sync.get({ backend: "", secret: "" });
    return { backend: (v.backend || "").replace(/\/+$/, ""), secret: v.secret || "" };
  }
  function authHeaders(secret) {
    return secret ? { "X-Quirra-Secret": secret } : {};
  }
  async function hashUserServerSide(userId) {
    const { backend, secret } = await getSettings();
    const r = await fetch(`${backend}/api/v1/hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(secret) },
      body: JSON.stringify({ user_id: userId })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || "Hash failed");
    return j.user_hash;
  }
  async function postEvent(payload) {
    const { backend, secret } = await getSettings();
    const r = await fetch(`${backend}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(secret) },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || "Post failed");
    return j;
  }
  async function getAnalysis(eventId) {
    const { backend, secret } = await getSettings();
    const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
      headers: authHeaders(secret)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || "Analysis fetch failed");
    return j;
  }

  // src/lib/identity.ts
  async function getStableBrowserId() {
    const key = "quirra_browser_id";
    const existing = await chrome.storage.local.get(key);
    if (existing[key]) return existing[key];
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [key]: id });
    return id;
  }

  // src/lib/context.ts
  function inferContext(text) {
    const t = (text || "").toLowerCase();
    if (t.includes("essay") || t.includes("assignment")) return "course essay";
    if (t.includes("blog") || t.includes("seo")) return "blog brief";
    if (t.includes("memo") || t.includes("update")) return "team memo";
    if (t.includes("outline")) return "outline";
    return "general";
  }
  function isPublicUrl(href) {
    try {
      const u = new URL(href);
      return ["http:", "https:"].includes(u.protocol) && u.hostname !== "localhost";
    } catch {
      return false;
    }
  }

  // src/overlay.ts
  var QuirraOverlay = class {
    constructor() {
      this.mounted = false;
      this.onKeyDown = (e) => {
        if (e.altKey) document.documentElement.classList.add("quirra-alt");
      };
      this.onKeyUp = () => {
        document.documentElement.classList.remove("quirra-alt");
      };
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
      <div class="qr-row"><span class="qr-dot"></span><span>Analyzing\u2026</span></div>
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
      <div class="qr-row"><span class="qr-dot"></span><span>Analyzing prompt\u2026</span></div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
    }
    showPromptResults(scores, suggestions) {
      this.mount();
      const riskCls = scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";
      const tips = suggestions?.length ? `<ul class="qr-list">${suggestions.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : `<div class="qr-sub">No suggestions \u2014 looks good</div>`;
      this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-metrics">
        <div>Prompt risk: <b class="${riskCls}">${scores.risk}%</b>
          <span class="qr-sub"> \xB7 dup ${scores.duplication_pct}% \xB7 style ${scores.style_pct}%</span>
        </div>
      </div>
      <div class="qr-section">
        <div class="qr-title">Suggestions</div>
        ${tips}
      </div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
    }
    showResults(scores, neighbors, labels) {
      this.mount();
      const riskCls = scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";
      const list = neighbors.slice(0, 5).map((n) => {
        const sim = n.similarity != null ? ` \xB7 sim ${(n.similarity * 100).toFixed(0)}%` : "";
        const ctx = n.context ? ` \xB7 ${escapeHtml(n.context)}` : "";
        const when = n.when ? ` \xB7 ${escapeHtml(timeAgo(n.when))}` : "";
        const ref = n.url ? ` \xB7 <a href="${escapeAttr(n.url)}" target="_blank" rel="noopener noreferrer">ref</a>` : "";
        return `<li>\u2022 ${escapeHtml(n.event_id.slice(0, 8))}${ctx}${when}${sim}${ref}</li>`;
      }).join("");
      const labelChips = (labels ?? []).map((l) => {
        const cls = l.startsWith("risk:high") ? "qr-chip-red" : l.startsWith("risk:") ? "qr-chip-amber" : l.startsWith("duplicate:") ? "qr-chip-violet" : "qr-chip-default";
        return `<span class="qr-chip ${cls}">${escapeHtml(l)}</span>`;
      }).join("");
      this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-metrics">
        <div>Risk: <b class="${riskCls}">${scores.risk}%</b>
          <span class="qr-sub"> \xB7 dup ${scores.duplication_pct}% \xB7 style ${scores.style_pct}% \xB7 seen ${scores.seen_count}</span>
        </div>
      </div>
      ${labelChips ? `<div class="qr-chips">${labelChips}</div>` : ""}
      ${neighbors.length ? `<div class="qr-section"><div class="qr-title">Near matches</div><ul class="qr-list">${list}</ul></div>` : `<div class="qr-section"><div class="qr-title">Near matches</div><div class="qr-sub">None found</div></div>`}
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>
    `;
    }
    injectStyles() {
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
  };
  function escapeHtml(s) {
    return (s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
  function timeAgo(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // src/content.ts
  var AI_HOSTNAMES = /* @__PURE__ */ new Set([
    "chat.openai.com",
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "bard.google.com",
    "copilot.microsoft.com",
    "bing.com",
    "you.com",
    "perplexity.ai",
    "poe.com",
    "character.ai",
    "mistral.ai",
    "chat.mistral.ai",
    "huggingface.co",
    "replicate.com",
    "cluely.com"
  ]);
  var hostname = location.hostname.replace(/^www\./, "");
  var isAiSite = AI_HOSTNAMES.has(hostname);
  var isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (isAiSite && !isLocalhost) {
    init();
  }
  function init() {
    const overlay = new QuirraOverlay();
    const PROMPT_SELECTOR = [
      "textarea",
      '[contenteditable="true"]',
      'div[role="textbox"]'
    ].join(",");
    let promptTimer = null;
    let lastPromptHash = "";
    document.addEventListener(
      "input",
      (e) => {
        const t = e.target;
        if (!t?.matches?.(PROMPT_SELECTOR)) return;
        const text = readText(t);
        if (!text || text.trim().length < 24) return;
        if (promptTimer) clearTimeout(promptTimer);
        promptTimer = setTimeout(() => void analyzePrompt(text), 700);
      },
      { capture: true }
    );
    async function analyzePrompt(text) {
      try {
        const hash = await sha256(text.replace(/\s+/g, " ").trim().toLowerCase());
        if (hash === lastPromptHash) return;
        lastPromptHash = hash;
        overlay.showPromptAnalyzing();
        const stableId = await getStableBrowserId();
        const user_hash = await hashUserServerSide(stableId);
        const { event_id } = await postEvent({
          kind: "prompt",
          content: text,
          metadata: {
            user_hash,
            url: location.href,
            context: inferContext(text),
            public: false
          }
        });
        const ar = await getAnalysis(event_id);
        overlay.showPromptResults(ar.scores, buildPromptSuggestions(text, ar.scores));
      } catch (e) {
        overlay.showError(e instanceof Error ? e.message : "Prompt analysis failed");
      }
    }
    const RESPONSE_SELECTORS = [
      '[data-testid="ai-response"]',
      '[data-testid="conversation-turn-content"]',
      ".assistant-message",
      ".response-content",
      ".ai-output",
      // Claude.ai
      "[data-is-streaming]",
      ".font-claude-message",
      // ChatGPT
      '[data-message-author-role="assistant"]'
    ];
    function getLatestResponse() {
      for (const sel of RESPONSE_SELECTORS) {
        const nodes = Array.from(document.querySelectorAll(sel));
        if (nodes.length) {
          const last = nodes[nodes.length - 1];
          const txt = (last.innerText || last.textContent || "").trim();
          if (txt.length > 10) return txt;
        }
      }
      return "";
    }
    let lastResponseSent = "";
    let responseInFlight = false;
    let responseTimer = null;
    function scheduleResponseAnalysis(text) {
      if (responseTimer) clearTimeout(responseTimer);
      responseTimer = setTimeout(() => {
        if (text !== lastResponseSent && !responseInFlight) {
          lastResponseSent = text;
          void analyzeResponse(text);
        }
      }, 1200);
    }
    async function analyzeResponse(text) {
      responseInFlight = true;
      try {
        overlay.showAnalyzing();
        const stableId = await getStableBrowserId();
        const user_hash = await hashUserServerSide(stableId);
        const { event_id } = await postEvent({
          kind: "response",
          content: text,
          metadata: {
            user_hash,
            url: location.href,
            context: inferContext(text),
            public: isPublicUrl(location.href)
          }
        });
        const analysis = await pollAnalysis(event_id);
        overlay.showResults(analysis.scores, analysis.neighbors || [], analysis.labels);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        overlay.showError(e instanceof Error ? e.message : "Response analysis failed");
      } finally {
        responseInFlight = false;
      }
    }
    function findObserveTarget() {
      const candidates = [
        'main[class*="chat"]',
        '[id*="chat"]',
        '[class*="conversation"]',
        '[class*="messages"]',
        "main"
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return document.body;
    }
    const observeTarget = findObserveTarget();
    const mo = new MutationObserver(() => {
      const text = getLatestResponse();
      if (text) scheduleResponseAnalysis(text);
    });
    mo.observe(observeTarget, {
      childList: true,
      subtree: true,
      // Don't watch attribute/character changes — only structural DOM additions
      attributes: false,
      characterData: false
    });
    window.addEventListener("beforeunload", () => {
      mo.disconnect();
      if (responseTimer) clearTimeout(responseTimer);
      overlay.destroy();
    });
    function readText(el) {
      if (el.value != null)
        return el.value;
      return el.innerText || el.textContent || "";
    }
    async function sha256(s) {
      const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(s)
      );
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let pollAbortController = null;
    async function pollAnalysis(id, maxTries = 5, baseDelayMs = 600) {
      if (pollAbortController) pollAbortController.abort();
      pollAbortController = new AbortController();
      const signal = pollAbortController.signal;
      for (let i = 0; i < maxTries; i++) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const r = await getAnalysis(id);
        if (!r.status || r.status === "done") return r;
        if (r.status === "unavailable") throw new Error(r.status);
        const delay = baseDelayMs * Math.pow(2, i);
        await sleep(delay, signal);
      }
      return getAnalysis(id);
    }
    function sleep(ms, signal) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }
    function buildPromptSuggestions(text, scores) {
      const s = [];
      const t = text.trim();
      if (t.length < 80) s.push("Add specifics: audience, domain, constraints, and examples.");
      if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective.");
      if (!/\bn\b|\bwords?\b|\bsteps?\b|\bformat\b|\bstyle\b/i.test(t))
        s.push("Specify length, format, and writing style.");
      if (/\bjailbreak|\bbypass|\bignore\b.*(rules|instructions)/i.test(t))
        s.push("Remove jailbreak cues or policy-bypassing language.");
      if (scores.style_pct > 70)
        s.push("Vary sentence structure and avoid boilerplate phrases.");
      if (!s.length) s.push("Nice prompt. Refine with target, style, and constraints if needed.");
      return s;
    }
  }
})();
