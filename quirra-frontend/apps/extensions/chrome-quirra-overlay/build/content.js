"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/lib/api.ts
  var api_exports = {};
  __export(api_exports, {
    getAnalysis: () => getAnalysis,
    hashUserServerSide: () => hashUserServerSide,
    postEvent: () => postEvent
  });
  async function getSettings() {
    if (_settingsCache) return _settingsCache;
    const v = await chrome.storage.sync.get({ backend: "", secret: "" });
    _settingsCache = {
      backend: (v.backend || "").replace(/\/+$/, ""),
      secret: v.secret || ""
    };
    chrome.storage.onChanged.addListener(() => {
      _settingsCache = null;
    });
    return _settingsCache;
  }
  function assertBackend(backend) {
    if (!backend) throw new Error(
      "Quirra: backend URL not set. Go to Extension options and enter your backend URL."
    );
  }
  function auth(secret) {
    return secret ? { "X-Quirra-Secret": secret } : {};
  }
  async function hashUserServerSide(userId) {
    const { backend, secret } = await getSettings();
    assertBackend(backend);
    const r = await fetch(`${backend}/api/v1/hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(secret) },
      body: JSON.stringify({ user_id: userId })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || "Hash failed");
    return j.user_hash;
  }
  async function postEvent(payload) {
    const { backend, secret } = await getSettings();
    assertBackend(backend);
    const r = await fetch(`${backend}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(secret) },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || "Post failed");
    return j;
  }
  async function getAnalysis(eventId) {
    const { backend, secret } = await getSettings();
    assertBackend(backend);
    const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
      headers: auth(secret)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || "Analysis fetch failed");
    return j;
  }
  var _settingsCache;
  var init_api = __esm({
    "src/lib/api.ts"() {
      "use strict";
      _settingsCache = null;
    }
  });

  // src/content.ts
  init_api();

  // src/overlay.ts
  var QuirraOverlay = class {
    constructor() {
      this.mounted = false;
      this.state = "full";
      this.opacity = 0.85;
      this.root = document.createElement("div");
      this.root.className = "qr-root";
      this.bubble = document.createElement("div");
      this.bubble.className = "qr-bubble";
      this.bubble.innerHTML = `<span class="qr-bubble-q">Q</span>`;
      this.bubble.title = "Expand Quirra";
      this.bubble.addEventListener("click", () => this.setState("full"));
      this.card = document.createElement("div");
      this.card.className = "qr-card";
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
      header.querySelector(".qr-controls").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "minimize") this.setState("minimized");
        if (action === "resize") this.setState(this.state === "compact" ? "full" : "compact");
        if (action === "opacity") this.slider.classList.toggle("qr-hidden");
      });
      this.makeDraggable(header);
      this.slider = document.createElement("input");
      this.slider.type = "range";
      this.slider.min = "20";
      this.slider.max = "98";
      this.slider.value = String(Math.round(this.opacity * 100));
      this.slider.className = "qr-opacity-slider qr-hidden";
      this.slider.addEventListener("input", () => {
        this.opacity = Number(this.slider.value) / 100;
        this.card.style.background = `rgba(14,14,20,${this.opacity})`;
      });
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
    showPromptResults(scores, suggestions, isPreview) {
      this.mount();
      this.setBubbleRisk(scores.risk, false);
      const badge = isPreview ? `<span class="qr-badge">live</span>` : "";
      this.body.innerHTML = `
      <div class="qr-metrics">
        <span class="qr-lsm">RISK</span>
        <b class="${rc(scores.risk)}">${scores.risk}%</b>
        <span class="qr-muted"> \xB7 style ${scores.style_pct}%</span>
        ${badge}
      </div>
      <div class="qr-section">
        <div class="qr-lbl">Suggestions</div>
        <ul class="qr-list">${suggestions.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
    `;
    }
    showResults(scores, neighbors, labels, isPreview) {
      this.mount();
      this.setBubbleRisk(scores.risk, false);
      const badge = isPreview ? `<span class="qr-badge">refining\u2026</span>` : "";
      const chips = labels.map((l) => `<span class="qr-chip ${cc(l)}">${esc(l)}</span>`).join("");
      const neighs = neighbors.slice(0, 5).map((n) => {
        const sim = n.similarity != null ? ` \xB7 ${(n.similarity * 100).toFixed(0)}%` : "";
        const when = n.when ? ` \xB7 ${ago(n.when)}` : "";
        const ref = n.url ? ` <a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">\u2197</a>` : "";
        return `<li>${esc(n.event_id.slice(0, 8))}${when}${sim}${ref}</li>`;
      }).join("");
      this.body.innerHTML = `
      <div class="qr-metrics">
        <span class="qr-lsm">RISK</span>
        <b class="${rc(scores.risk)}">${scores.risk}%</b>
        <span class="qr-muted"> \xB7 dup ${scores.duplication_pct}% \xB7 style ${scores.style_pct}% \xB7 seen ${scores.seen_count}</span>
        ${badge}
      </div>
      ${chips ? `<div class="qr-chips">${chips}</div>` : ""}
      <div class="qr-section">
        <div class="qr-lbl">Near matches</div>
        ${neighs ? `<ul class="qr-list">${neighs}</ul>` : `<span class="qr-muted">${isPreview ? "Checking\u2026" : "None found"}</span>`}
      </div>
    `;
    }
    showDuplicateAlert(scores, alert) {
      this.mount();
      this.setState("full");
      this.setBubbleRisk(scores.risk, true);
      const firstSeen = alert.first_seen ? `<div class="qr-dm">First seen: <b>${new Date(alert.first_seen).toLocaleDateString()}</b></div>` : "";
      const sourceLink = alert.source_url ? `<div class="qr-dm">Source: <a href="${esc(alert.source_url)}" target="_blank" rel="noopener noreferrer">${esc(shortUrl(alert.source_url))}</a></div>` : "";
      this.body.innerHTML = `
      <div class="qr-dup-banner">
        <div class="qr-dup-icon">\u26A0</div>
        <div>
          <div class="qr-dup-title">Response seen before</div>
          <div class="qr-dup-msg">${esc(alert.message)}</div>
          <div class="qr-dup-stats">
            <span class="qr-dup-stat qr-red">${alert.similarity}% match</span>
            <span class="qr-dup-stat">Seen ${alert.seen_count}\xD7</span>
          </div>
          ${firstSeen}${sourceLink}
        </div>
      </div>
      <div class="qr-section" style="margin-top:8px">
        <div class="qr-metrics">
          <span class="qr-lsm">RISK</span>
          <b class="${rc(scores.risk)}">${scores.risk}%</b>
          <span class="qr-muted"> \xB7 style ${scores.style_pct}%</span>
        </div>
      </div>
    `;
    }
    appendNote(msg) {
      if (!this.mounted) return;
      let el = this.body.querySelector(".qr-note");
      if (!el) {
        el = document.createElement("div");
        el.className = "qr-note";
        this.body.appendChild(el);
      }
      el.textContent = `\u26A0 ${msg}`;
    }
    // ── Private ───────────────────────────────────────────────────────────────
    setState(s) {
      this.state = s;
      this.applyState();
    }
    applyState() {
      const min = this.state === "minimized";
      this.bubble.style.display = min ? "flex" : "none";
      this.card.style.display = min ? "none" : "flex";
      this.card.classList.toggle("qr-compact", this.state === "compact");
    }
    setBubbleRisk(risk, isDup) {
      this.bubble.className = isDup ? "qr-bubble qr-bubble-dup" : risk >= 70 ? "qr-bubble qr-bubble-red" : risk >= 40 ? "qr-bubble qr-bubble-amber" : "qr-bubble qr-bubble-green";
    }
    makeDraggable(handle) {
      let sx = 0, sy = 0, sr = 16, sb = 16, drag = false;
      handle.style.cursor = "grab";
      handle.addEventListener("mousedown", (e) => {
        if (e.target.closest("button")) return;
        drag = true;
        sx = e.clientX;
        sy = e.clientY;
        const r = this.root.getBoundingClientRect();
        sr = window.innerWidth - r.right;
        sb = window.innerHeight - r.bottom;
        handle.style.cursor = "grabbing";
        e.preventDefault();
      });
      document.addEventListener("mousemove", (e) => {
        if (!drag) return;
        this.root.style.right = `${Math.max(0, sr + (sx - e.clientX))}px`;
        this.root.style.bottom = `${Math.max(0, sb + (sy - e.clientY))}px`;
      });
      document.addEventListener("mouseup", () => {
        if (!drag) return;
        drag = false;
        handle.style.cursor = "grab";
      });
    }
    injectStyles() {
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
  };
  function rc(r) {
    return r >= 70 ? "qr-red" : r >= 40 ? "qr-amber" : "qr-green";
  }
  function cc(l) {
    if (l.startsWith("risk:high")) return "qr-chip-red";
    if (l.startsWith("risk:")) return "qr-chip-amber";
    if (l.startsWith("duplicate:")) return "qr-chip-violet";
    return "qr-chip-grey";
  }
  function esc(s) {
    return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }
  function ago(iso) {
    if (!iso) return "";
    const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 6e4);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function shortUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch {
      return url.slice(0, 30);
    }
  }

  // src/content.ts
  var SITE_CONFIGS = {
    // ── Claude (claude.ai) ──────────────────────────────────────────────────────
    "claude.ai": {
      responseSelectors: [
        ".font-claude-response-body",
        '[class*="font-claude-response"]',
        ".standard-markdown",
        "[data-is-streaming]"
      ],
      promptSelectors: [
        'div[contenteditable="true"]',
        "p[data-placeholder]",
        "textarea"
      ],
      containerSelector: '[class*="conversation"]'
    },
    // ── ChatGPT (chatgpt.com / chat.openai.com) ──────────────────────────────────
    // Confirmed from live DOM: responses are in SECTION[data-testid^="conversation-turn-"]
    // The assistant turn is always even-numbered (turn-2, turn-4 etc.)
    // .text-message is the stable class on the response content wrapper.
    "chatgpt.com": {
      responseSelectors: [
        '[data-testid^="conversation-turn-"] .text-message',
        '[data-testid^="conversation-turn-"]',
        ".text-message",
        ".flex.flex-col.gap-4.grow"
      ],
      promptSelectors: ["#prompt-textarea", "textarea"],
      containerSelector: ".flex.flex-col.text-sm"
    },
    "chat.openai.com": {
      responseSelectors: [
        '[data-testid^="conversation-turn-"] .text-message',
        '[data-testid^="conversation-turn-"]',
        ".text-message"
      ],
      promptSelectors: ["#prompt-textarea", "textarea"],
      containerSelector: "main"
    },
    // ── Gemini (gemini.google.com) ────────────────────────────────────────────────
    // Confirmed from live DOM:
    //   data-xid="aim-zsv2-turns-container" is the conversation container
    //   jsname="H7tCnf" is the response text element
    //   data-xid="aim-zero-state" wraps the full response area
    "gemini.google.com": {
      responseSelectors: [
        '[jsname="H7tCnf"]',
        '[data-xid="aim-zsv2-turns-container"]',
        '[data-xid="aim-zero-state"]'
      ],
      promptSelectors: [
        "textarea",
        'div[contenteditable="true"]',
        '[jsname="tgaKEf"]'
      ],
      containerSelector: '[data-xid="aim-zsv2-turns-container"]'
    },
    "bard.google.com": {
      responseSelectors: [
        '[jsname="H7tCnf"]',
        '[data-xid="aim-zsv2-turns-container"]'
      ],
      promptSelectors: ["textarea", 'div[contenteditable="true"]'],
      containerSelector: '[data-xid="aim-zsv2-turns-container"]'
    },
    // ── Microsoft Copilot (copilot.microsoft.com) ───────────────────────────────
    "copilot.microsoft.com": {
      responseSelectors: [
        '[data-testid="ai-message"]',
        ".ac-adaptiveCard",
        "cib-message[role='assistant']",
        ".cib-chat-turn"
      ],
      promptSelectors: ["textarea", 'div[contenteditable="true"]'],
      containerSelector: "cib-chat-turn"
    },
    // ── Perplexity (perplexity.ai) ──────────────────────────────────────────────
    "perplexity.ai": {
      responseSelectors: [
        ".prose",
        '[data-testid="answer-text"]',
        ".answer-content",
        "[class*='prose']"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "main"
    },
    // ── Poe (poe.com) ───────────────────────────────────────────────────────────
    "poe.com": {
      responseSelectors: [
        ".Message_humanMessage__N9TQi",
        "[class*='Message_botMessage']",
        "[class*='Message_humanMessage']",
        ".Markdown_markdownContainer__Tz3AP",
        "[class*='Markdown_markdownContainer']"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "[class*='ChatMessagesView']"
    },
    // ── You.com ──────────────────────────────────────────────────────────────────
    "you.com": {
      responseSelectors: [
        "[data-testid='youchat-response']",
        ".chatResult",
        "[class*='chatResult']",
        ".prose"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "main"
    },
    // ── Character.ai ─────────────────────────────────────────────────────────────
    "character.ai": {
      responseSelectors: [
        "[class*='ChatMessage_']",
        "p.swiper-no-swiping",
        "[data-testid='user-response']"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "[class*='ChatBody']"
    },
    // ── Mistral (mistral.ai / chat.mistral.ai) ───────────────────────────────────
    "mistral.ai": {
      responseSelectors: [
        "[class*='AssistantMessage']",
        "[class*='assistant-message']",
        ".prose"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "main"
    },
    "chat.mistral.ai": {
      responseSelectors: [
        "[class*='AssistantMessage']",
        ".prose"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "main"
    },
    // ── Replit (replit.com) ──────────────────────────────────────────────────────
    "replit.com": {
      responseSelectors: [
        "[class*='assistant']",
        "[data-cy='assistant-message']",
        ".prose",
        "[class*='AiResponse']",
        "[class*='aiResponse']"
      ],
      promptSelectors: ["textarea", 'div[contenteditable="true"]'],
      containerSelector: "[class*='chat']"
    },
    // ── Lovable (lovable.dev) ────────────────────────────────────────────────────
    "lovable.dev": {
      responseSelectors: [
        "[class*='assistant']",
        "[class*='AiMessage']",
        ".prose",
        "[class*='message-content']"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "[class*='chat']"
    },
    // ── Bolt (bolt.new) ──────────────────────────────────────────────────────────
    "bolt.new": {
      responseSelectors: [
        "[class*='assistant']",
        "[class*='AssistantMessage']",
        ".prose"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "[class*='chat']"
    },
    // ── Hugging Face ─────────────────────────────────────────────────────────────
    "huggingface.co": {
      responseSelectors: [
        ".prose",
        "[class*='assistant']",
        "[data-testid='chatbot-user']"
      ],
      promptSelectors: ["textarea"],
      containerSelector: "main"
    }
  };
  var hostname = location.hostname.replace(/^www\./, "");
  var siteConfig = SITE_CONFIGS[hostname];
  if (!siteConfig) {
  } else {
    init(siteConfig);
  }
  function getStableBrowserId() {
    const KEY = "__quirra_uid__";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      try {
        localStorage.setItem(KEY, id);
      } catch {
      }
    }
    return id;
  }
  async function sha256(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function escHtml(s) {
    return (s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  }
  var RISK_TERMS = [
    "bypass",
    "jailbreak",
    "exploit",
    "ignore previous instructions",
    "ignore all instructions",
    "phishing",
    "malware",
    "weapon",
    "bomb",
    "poison",
    "harm",
    "kill",
    "deepfake",
    "hack",
    "dox",
    "password",
    "racist",
    "sexist",
    "hate speech"
  ];
  var LM_TELLS = ["as an ai", "as a language model", "cannot assist with that"];
  function localScore(text) {
    const t = (text || "").toLowerCase();
    const words = t.match(/[a-z0-9']+/g) || [];
    const len = words.length;
    const ttr = len > 0 ? new Set(words).size / len : 1;
    const style_pct = Math.round(Math.max(0, Math.min(100, (1 - ttr) * 150)));
    const hits = RISK_TERMS.filter((w) => t.includes(w)).length;
    const jailbreak = /ignore (previous|all) instructions|bypass|jailbreak/.test(t) ? 1 : 0;
    const lm_tell = LM_TELLS.some((p) => t.includes(p)) ? 1 : 0;
    const risk = Math.round(Math.min(100, hits * 12 + jailbreak * 30 + lm_tell * 10));
    return { duplication_pct: 0, style_pct, risk, seen_count: 0 };
  }
  function localSuggestions(text, scores) {
    const s = [];
    const t = text.trim();
    if (t.length < 80) s.push("Add specifics: audience, domain, and constraints.");
    if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective.");
    if (!/\bformat\b|\bstyle\b|\bwords?\b|\bsteps?\b/i.test(t))
      s.push("Specify the length, format, and writing style.");
    if (/jailbreak|bypass|ignore.*instructions/i.test(t))
      s.push("Remove jailbreak or policy-bypass language.");
    if (scores.style_pct > 70) s.push("Vary sentence structure \u2014 high repetition detected.");
    if (scores.risk > 60) s.push("High risk score \u2014 review for policy-sensitive content.");
    if (!s.length) s.push("Looks good. Add target audience and constraints to refine.");
    return s;
  }
  var HL_CLASS = "quirra-dup-highlight";
  function highlightResponse(el) {
    removeHighlight();
    if (!el) return;
    el.classList.add(HL_CLASS);
    if (!document.getElementById("quirra-hl-style")) {
      const s = document.createElement("style");
      s.id = "quirra-hl-style";
      s.textContent = `.${HL_CLASS}{outline:2px solid rgba(248,113,113,.55)!important;outline-offset:3px!important;border-radius:6px!important;background:rgba(248,113,113,.08)!important}`;
      document.head.appendChild(s);
    }
  }
  function removeHighlight() {
    document.querySelectorAll(`.${HL_CLASS}`).forEach((el) => el.classList.remove(HL_CLASS));
  }
  function showToast(alert) {
    document.getElementById("quirra-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "quirra-toast";
    const firstSeen = alert.first_seen ? `<div style="font-size:11px;opacity:.6;margin-top:3px">First seen: ${new Date(alert.first_seen).toLocaleDateString()}</div>` : "";
    const sourceHtml = alert.source_url ? `<div style="font-size:11px;margin-top:4px"><a href="${escHtml(alert.source_url)}" target="_blank" rel="noopener noreferrer" style="color:#fca5a5">View source \u2197</a></div>` : "";
    toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:18px;flex-shrink:0">\u26A0\uFE0F</span>
      <div style="flex:1">
        <div style="font-weight:650;margin-bottom:3px;font-size:13px">Response seen before</div>
        <div style="font-size:12px;opacity:.9">${escHtml(alert.message)}</div>
        ${firstSeen}${sourceHtml}
      </div>
      <button id="quirra-toast-close" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:16px;padding:0">\u2715</button>
    </div>`;
    Object.assign(toast.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "2147483647",
      maxWidth: "360px",
      padding: "12px 14px",
      borderRadius: "12px",
      background: "rgba(30,10,10,0.92)",
      border: "1px solid rgba(248,113,113,0.45)",
      backdropFilter: "blur(14px)",
      color: "#f0f0f4",
      fontFamily: "system-ui,-apple-system,sans-serif",
      boxShadow: "0 8px 28px rgba(0,0,0,.5)",
      animation: "quirraSlideIn .3s ease"
    });
    if (!document.getElementById("quirra-toast-anim")) {
      const s = document.createElement("style");
      s.id = "quirra-toast-anim";
      s.textContent = `@keyframes quirraSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`;
      document.head.appendChild(s);
    }
    document.body.appendChild(toast);
    document.getElementById("quirra-toast-close")?.addEventListener("click", () => {
      toast.remove();
      removeHighlight();
    });
    setTimeout(() => toast.remove(), 8e3);
  }
  function init(config) {
    const overlay = new QuirraOverlay();
    let cachedUserHash = null;
    async function getUserHash() {
      if (cachedUserHash) return cachedUserHash;
      const { hashUserServerSide: hashUserServerSide2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      cachedUserHash = await hashUserServerSide2(getStableBrowserId());
      return cachedUserHash;
    }
    getUserHash().catch(() => {
    });
    const PROMPT_SEL = (config.promptSelectors ?? [
      "textarea",
      'div[contenteditable="true"]',
      "p[data-placeholder]"
    ]).join(",");
    let promptTimer = null;
    let lastPromptHash = "";
    document.addEventListener("input", (e) => {
      const el = e.target;
      if (!el?.matches?.(PROMPT_SEL)) return;
      const text = readText(el);
      if (!text || text.trim().length < 24) return;
      const instant = localScore(text);
      overlay.showPromptResults(instant, localSuggestions(text, instant), true);
      if (promptTimer) clearTimeout(promptTimer);
      promptTimer = setTimeout(() => void remotePrompt(text), 1e3);
    }, { capture: true });
    async function remotePrompt(text) {
      try {
        const hash = await sha256(text.trim().toLowerCase().replace(/\s+/g, " "));
        if (hash === lastPromptHash) return;
        lastPromptHash = hash;
        const user_hash = await getUserHash();
        const { event_id } = await postEvent({
          kind: "prompt",
          content: text,
          metadata: { user_hash, url: location.href, public: false }
        });
        const ar = await getAnalysis(event_id);
        overlay.showPromptResults(ar.scores, localSuggestions(text, ar.scores), false);
      } catch (e) {
        overlay.appendNote(e instanceof Error ? e.message : "Backend unreachable");
      }
    }
    function getLatestResponse() {
      for (const sel of config.responseSelectors) {
        const nodes = [...document.querySelectorAll(sel)];
        if (!nodes.length) continue;
        const el2 = nodes.at(-1);
        const txt = (el2.innerText || el2.textContent || "").trim();
        if (txt.length > 80) return { el: el2, text: txt };
      }
      const candidates = [...document.querySelectorAll("p, div, article")].filter((el2) => {
        const txt = (el2.innerText || "").trim();
        return txt.length > 150 && txt.length < 15e3 && el2.children.length < 10 && !el2.matches(PROMPT_SEL) && !el2.closest("nav, header, footer, aside, [class*='sidebar'], [class*='input']");
      });
      if (!candidates.length) return null;
      const el = candidates.at(-1);
      return { el, text: (el.innerText || "").trim() };
    }
    let lastAnalyzedHash = "";
    let responseInFlight = false;
    let responseTimer = null;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        lastAnalyzedHash = "";
        responseInFlight = false;
        if (responseTimer) clearTimeout(responseTimer);
        removeHighlight();
        document.getElementById("quirra-toast")?.remove();
        overlay.showResults({ duplication_pct: 0, style_pct: 0, risk: 0, seen_count: 0 }, [], [], true);
      }
    }, { capture: true });
    async function analyzeResponse(text, el) {
      const hash = await sha256(text.slice(0, 500));
      if (hash === lastAnalyzedHash) return;
      lastAnalyzedHash = hash;
      responseInFlight = true;
      removeHighlight();
      document.getElementById("quirra-toast")?.remove();
      try {
        const user_hash = await getUserHash();
        const { event_id } = await postEvent({
          kind: "response",
          content: text,
          metadata: { user_hash, url: location.href, public: false }
        });
        const analysis = await pollAnalysis(event_id);
        overlay.showResults(
          analysis.scores,
          analysis.neighbors || [],
          analysis.labels || [],
          false
        );
        const dup = analysis.duplicate_alert;
        if (dup?.detected) {
          highlightResponse(el);
          showToast(dup);
          overlay.showDuplicateAlert(analysis.scores, dup);
        }
      } catch (e) {
        overlay.appendNote(e instanceof Error ? e.message : "Backend unreachable");
      } finally {
        responseInFlight = false;
      }
    }
    function onMutation() {
      if (observeTarget === document.body && config.containerSelector) {
        const better = document.querySelector(config.containerSelector);
        if (better && better !== document.body) {
          mo.disconnect();
          observeTarget = better;
          mo.observe(observeTarget, OBS_OPTIONS);
        }
      }
      const result = getLatestResponse();
      if (!result) return;
      if (!responseInFlight) {
        overlay.showResults(localScore(result.text), [], [], true);
      }
      if (responseTimer) clearTimeout(responseTimer);
      responseTimer = setTimeout(() => {
        if (!responseInFlight) void analyzeResponse(result.text, result.el);
      }, 1500);
    }
    const OBS_OPTIONS = { childList: true, subtree: true, attributes: false, characterData: false };
    let observeTarget = (config.containerSelector ? document.querySelector(config.containerSelector) : null) ?? document.body;
    let mo = new MutationObserver(onMutation);
    mo.observe(observeTarget, OBS_OPTIONS);
    if (observeTarget === document.body) {
      const bodyWatcher = new MutationObserver(() => {
        if (!config.containerSelector) return;
        const better = document.querySelector(config.containerSelector);
        if (better && better !== observeTarget) {
          mo.disconnect();
          observeTarget = better;
          mo.observe(observeTarget, OBS_OPTIONS);
          bodyWatcher.disconnect();
        }
      });
      bodyWatcher.observe(document.body, { childList: true, subtree: false });
    }
    window.addEventListener("beforeunload", () => {
      mo.disconnect();
      if (promptTimer) clearTimeout(promptTimer);
      if (responseTimer) clearTimeout(responseTimer);
      removeHighlight();
      overlay.destroy();
    });
    function readText(el) {
      return el.value ?? el.innerText ?? el.textContent ?? "";
    }
    let pollAbort = null;
    async function pollAnalysis(id, tries = 6, baseMs = 600) {
      if (pollAbort) pollAbort.abort();
      pollAbort = new AbortController();
      const { signal } = pollAbort;
      for (let i = 0; i < tries; i++) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const r = await getAnalysis(id);
        if (!r.status || r.status === "done") return r;
        if (r.status === "unavailable") throw new Error("Backend unavailable");
        await sleep(baseMs * Math.pow(2, i), signal);
      }
      return getAnalysis(id);
    }
    function sleep(ms, signal) {
      return new Promise((res, rej) => {
        const t = setTimeout(res, ms);
        signal?.addEventListener("abort", () => {
          clearTimeout(t);
          rej(new DOMException("Aborted", "AbortError"));
        });
      });
    }
  }
})();
