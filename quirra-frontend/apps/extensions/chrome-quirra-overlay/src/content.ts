// extensions/chrome-quirra-overlay/src/content.ts
// Confirmed response selectors for each AI platform from live DOM inspection.

import { postEvent, getAnalysis, type DuplicateAlert } from "./lib/api";
import { QuirraOverlay, type Scores } from "./overlay";

// ─── AI site allowlist + per-site config ──────────────────────────────────────

interface SiteConfig {
  /** CSS selectors that match AI response containers, in priority order */
  responseSelectors: string[];
  /** CSS selectors that match the prompt input */
  promptSelectors?: string[];
  /** CSS selector for the main chat scroll container */
  containerSelector?: string;
}

const SITE_CONFIGS: Record<string, SiteConfig> = {
  // ── Claude (claude.ai) ──────────────────────────────────────────────────────
  "claude.ai": {
    responseSelectors: [
      ".font-claude-response-body",
      '[class*="font-claude-response"]',
      ".standard-markdown",
      '[data-is-streaming]',
    ],
    promptSelectors: [
      'div[contenteditable="true"]',
      'p[data-placeholder]',
      "textarea",
    ],
    containerSelector: '[class*="conversation"]',
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
      ".flex.flex-col.gap-4.grow",
    ],
    promptSelectors: ["#prompt-textarea", "textarea"],
    containerSelector: ".flex.flex-col.text-sm",
  },
  "chat.openai.com": {
    responseSelectors: [
      '[data-testid^="conversation-turn-"] .text-message',
      '[data-testid^="conversation-turn-"]',
      ".text-message",
    ],
    promptSelectors: ["#prompt-textarea", "textarea"],
    containerSelector: "main",
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
      '[data-xid="aim-zero-state"]',
    ],
    promptSelectors: [
      'textarea',
      'div[contenteditable="true"]',
      '[jsname="tgaKEf"]',
    ],
    containerSelector: '[data-xid="aim-zsv2-turns-container"]',
  },
  "bard.google.com": {
    responseSelectors: [
      '[jsname="H7tCnf"]',
      '[data-xid="aim-zsv2-turns-container"]',
    ],
    promptSelectors: ['textarea', 'div[contenteditable="true"]'],
    containerSelector: '[data-xid="aim-zsv2-turns-container"]',
  },

  // ── Microsoft Copilot (copilot.microsoft.com) ───────────────────────────────
  "copilot.microsoft.com": {
    responseSelectors: [
      '[data-testid="ai-message"]',
      ".ac-adaptiveCard",
      "cib-message[role='assistant']",
      ".cib-chat-turn",
    ],
    promptSelectors: ["textarea", 'div[contenteditable="true"]'],
    containerSelector: "cib-chat-turn",
  },

  // ── Perplexity (perplexity.ai) ──────────────────────────────────────────────
  "perplexity.ai": {
    responseSelectors: [
      ".prose",
      '[data-testid="answer-text"]',
      ".answer-content",
      "[class*='prose']",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "main",
  },

  // ── Poe (poe.com) ───────────────────────────────────────────────────────────
  "poe.com": {
    responseSelectors: [
      ".Message_humanMessage__N9TQi",
      "[class*='Message_botMessage']",
      "[class*='Message_humanMessage']",
      ".Markdown_markdownContainer__Tz3AP",
      "[class*='Markdown_markdownContainer']",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "[class*='ChatMessagesView']",
  },

  // ── You.com ──────────────────────────────────────────────────────────────────
  "you.com": {
    responseSelectors: [
      "[data-testid='youchat-response']",
      ".chatResult",
      "[class*='chatResult']",
      ".prose",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "main",
  },

  // ── Character.ai ─────────────────────────────────────────────────────────────
  "character.ai": {
    responseSelectors: [
      "[class*='ChatMessage_']",
      "p.swiper-no-swiping",
      "[data-testid='user-response']",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "[class*='ChatBody']",
  },

  // ── Mistral (mistral.ai / chat.mistral.ai) ───────────────────────────────────
  "mistral.ai": {
    responseSelectors: [
      "[class*='AssistantMessage']",
      "[class*='assistant-message']",
      ".prose",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "main",
  },
  "chat.mistral.ai": {
    responseSelectors: [
      "[class*='AssistantMessage']",
      ".prose",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "main",
  },

  // ── Replit (replit.com) ──────────────────────────────────────────────────────
  "replit.com": {
    responseSelectors: [
      "[class*='assistant']",
      "[data-cy='assistant-message']",
      ".prose",
      "[class*='AiResponse']",
      "[class*='aiResponse']",
    ],
    promptSelectors: ["textarea", 'div[contenteditable="true"]'],
    containerSelector: "[class*='chat']",
  },

  // ── Lovable (lovable.dev) ────────────────────────────────────────────────────
  "lovable.dev": {
    responseSelectors: [
      "[class*='assistant']",
      "[class*='AiMessage']",
      ".prose",
      "[class*='message-content']",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "[class*='chat']",
  },

  // ── Bolt (bolt.new) ──────────────────────────────────────────────────────────
  "bolt.new": {
    responseSelectors: [
      "[class*='assistant']",
      "[class*='AssistantMessage']",
      ".prose",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "[class*='chat']",
  },

  // ── Hugging Face ─────────────────────────────────────────────────────────────
  "huggingface.co": {
    responseSelectors: [
      ".prose",
      "[class*='assistant']",
      "[data-testid='chatbot-user']",
    ],
    promptSelectors: ["textarea"],
    containerSelector: "main",
  },
};

// Get config for current site, with fallback defaults
const hostname   = location.hostname.replace(/^www\./, "");
const siteConfig = SITE_CONFIGS[hostname];

if (!siteConfig) {
  // Not an AI site we recognise — do nothing
} else {
  init(siteConfig);
}

// ─── INLINE HELPERS ───────────────────────────────────────────────────────────

function getStableBrowserId(): string {
  const KEY = "__quirra_uid__";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    try { localStorage.setItem(KEY, id); } catch {}
  }
  return id;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function escHtml(s: string) {
  return (s || "").replace(/[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// ─── LOCAL SCORER ─────────────────────────────────────────────────────────────

const RISK_TERMS = [
  "bypass", "jailbreak", "exploit",
  "ignore previous instructions", "ignore all instructions",
  "phishing", "malware", "weapon", "bomb", "poison",
  "harm", "kill", "deepfake", "hack", "dox", "password",
  "racist", "sexist", "hate speech",
];
const LM_TELLS = ["as an ai", "as a language model", "cannot assist with that"];

function localScore(text: string): Scores {
  const t     = (text || "").toLowerCase();
  const words = t.match(/[a-z0-9']+/g) || [];
  const len   = words.length;
  const ttr   = len > 0 ? new Set(words).size / len : 1;
  const style_pct = Math.round(Math.max(0, Math.min(100, (1 - ttr) * 150)));
  const hits      = RISK_TERMS.filter(w => t.includes(w)).length;
  const jailbreak = /ignore (previous|all) instructions|bypass|jailbreak/.test(t) ? 1 : 0;
  const lm_tell   = LM_TELLS.some(p => t.includes(p)) ? 1 : 0;
  const risk      = Math.round(Math.min(100, hits * 12 + jailbreak * 30 + lm_tell * 10));
  return { duplication_pct: 0, style_pct, risk, seen_count: 0 };
}

function localSuggestions(text: string, scores: Scores): string[] {
  const s: string[] = [];
  const t = text.trim();
  if (t.length < 80)    s.push("Add specifics: audience, domain, and constraints.");
  if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective.");
  if (!/\bformat\b|\bstyle\b|\bwords?\b|\bsteps?\b/i.test(t))
    s.push("Specify the length, format, and writing style.");
  if (/jailbreak|bypass|ignore.*instructions/i.test(t))
    s.push("Remove jailbreak or policy-bypass language.");
  if (scores.style_pct > 70) s.push("Vary sentence structure — high repetition detected.");
  if (scores.risk > 60)      s.push("High risk score — review for policy-sensitive content.");
  if (!s.length) s.push("Looks good. Add target audience and constraints to refine.");
  return s;
}

// ─── HIGHLIGHT & TOAST ────────────────────────────────────────────────────────

const HL_CLASS = "quirra-dup-highlight";

function highlightResponse(el: HTMLElement | null) {
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
  document.querySelectorAll(`.${HL_CLASS}`).forEach(el => el.classList.remove(HL_CLASS));
}

function showToast(alert: DuplicateAlert) {
  document.getElementById("quirra-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "quirra-toast";
  const firstSeen  = alert.first_seen
    ? `<div style="font-size:11px;opacity:.6;margin-top:3px">First seen: ${new Date(alert.first_seen).toLocaleDateString()}</div>`
    : "";
  const sourceHtml = alert.source_url
    ? `<div style="font-size:11px;margin-top:4px"><a href="${escHtml(alert.source_url)}" target="_blank" rel="noopener noreferrer" style="color:#fca5a5">View source ↗</a></div>`
    : "";
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:18px;flex-shrink:0">⚠️</span>
      <div style="flex:1">
        <div style="font-weight:650;margin-bottom:3px;font-size:13px">Response seen before</div>
        <div style="font-size:12px;opacity:.9">${escHtml(alert.message)}</div>
        ${firstSeen}${sourceHtml}
      </div>
      <button id="quirra-toast-close" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:16px;padding:0">✕</button>
    </div>`;
  Object.assign(toast.style, {
    position: "fixed", top: "20px", right: "20px", zIndex: "2147483647",
    maxWidth: "360px", padding: "12px 14px", borderRadius: "12px",
    background: "rgba(30,10,10,0.92)", border: "1px solid rgba(248,113,113,0.45)",
    backdropFilter: "blur(14px)", color: "#f0f0f4",
    fontFamily: "system-ui,-apple-system,sans-serif",
    boxShadow: "0 8px 28px rgba(0,0,0,.5)", animation: "quirraSlideIn .3s ease",
  });
  if (!document.getElementById("quirra-toast-anim")) {
    const s = document.createElement("style");
    s.id = "quirra-toast-anim";
    s.textContent = `@keyframes quirraSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`;
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  document.getElementById("quirra-toast-close")?.addEventListener("click", () => {
    toast.remove(); removeHighlight();
  });
  setTimeout(() => toast.remove(), 8000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init(config: SiteConfig) {
  const overlay = new QuirraOverlay();

  let cachedUserHash: string | null = null;
  async function getUserHash(): Promise<string> {
    if (cachedUserHash) return cachedUserHash;
    const { hashUserServerSide } = await import("./lib/api");
    cachedUserHash = await hashUserServerSide(getStableBrowserId());
    return cachedUserHash;
  }
  getUserHash().catch(() => {});

  // ── PROMPT pipeline ───────────────────────────────────────────────────────

  const PROMPT_SEL = (config.promptSelectors ?? [
    "textarea",
    'div[contenteditable="true"]',
    'p[data-placeholder]',
  ]).join(",");

  let promptTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPromptHash = "";

  document.addEventListener("input", (e) => {
    const el = e.target as HTMLElement | null;
    if (!el?.matches?.(PROMPT_SEL)) return;
    const text = readText(el);
    if (!text || text.trim().length < 24) return;

    const instant = localScore(text);
    overlay.showPromptResults(instant, localSuggestions(text, instant), true);

    if (promptTimer) clearTimeout(promptTimer);
    promptTimer = setTimeout(() => void remotePrompt(text), 1000);
  }, { capture: true });

  async function remotePrompt(text: string) {
    try {
      const hash = await sha256(text.trim().toLowerCase().replace(/\s+/g, " "));
      if (hash === lastPromptHash) return;
      lastPromptHash = hash;
      const user_hash    = await getUserHash();
      const { event_id } = await postEvent({
        kind: "prompt", content: text,
        metadata: { user_hash, url: location.href, public: false },
      });
      const ar = await getAnalysis(event_id);
      overlay.showPromptResults(ar.scores as Scores, localSuggestions(text, ar.scores as Scores), false);
    } catch (e) {
      overlay.appendNote(e instanceof Error ? e.message : "Backend unreachable");
    }
  }

  // ── RESPONSE pipeline ─────────────────────────────────────────────────────

  function getLatestResponse(): { el: HTMLElement; text: string } | null {
    // Try site-specific selectors first
    for (const sel of config.responseSelectors) {
      const nodes = [...document.querySelectorAll(sel)];
      if (!nodes.length) continue;
      const el  = nodes.at(-1) as HTMLElement;
      const txt = (el.innerText || el.textContent || "").trim();
      if (txt.length > 80) return { el, text: txt };
    }

    // Universal fallback: find large text blocks not in nav/sidebar/input areas
    const candidates = ([...document.querySelectorAll("p, div, article")] as HTMLElement[])
      .filter(el => {
        const txt = (el.innerText || "").trim();
        return txt.length > 150
          && txt.length < 15000
          && el.children.length < 10
          && !el.matches(PROMPT_SEL)
          && !el.closest("nav, header, footer, aside, [class*='sidebar'], [class*='input']");
      });
    if (!candidates.length) return null;
    const el  = candidates.at(-1)!;
    return { el, text: (el.innerText || "").trim() };
  }

  let lastAnalyzedHash = "";
  let responseInFlight = false;
  let responseTimer: ReturnType<typeof setTimeout> | null = null;

  // Reset state on each new prompt submission
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

  async function analyzeResponse(text: string, el: HTMLElement) {
    const hash = await sha256(text.slice(0, 500));
    if (hash === lastAnalyzedHash) return;
    lastAnalyzedHash = hash;
    responseInFlight = true;
    removeHighlight();
    document.getElementById("quirra-toast")?.remove();
    try {
      const user_hash    = await getUserHash();
      const { event_id } = await postEvent({
        kind: "response", content: text,
        metadata: { user_hash, url: location.href, public: false },
      });
      const analysis = await pollAnalysis(event_id);
      overlay.showResults(
        analysis.scores as Scores,
        analysis.neighbors || [],
        analysis.labels    || [],
        false
      );
      const dup = analysis.duplicate_alert;
      if (dup?.detected) {
        highlightResponse(el);
        showToast(dup);
        overlay.showDuplicateAlert(analysis.scores as Scores, dup);
      }
    } catch (e) {
      overlay.appendNote(e instanceof Error ? e.message : "Backend unreachable");
    } finally {
      responseInFlight = false;
    }
  }

  function onMutation() {
    // Try to upgrade to a better container
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

  // Start with the configured container, fall back to body
  let observeTarget: Element = (config.containerSelector
    ? document.querySelector(config.containerSelector)
    : null) ?? document.body;

  let mo = new MutationObserver(onMutation);
  mo.observe(observeTarget, OBS_OPTIONS);

  // Watch for the container to appear after page load
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
    if (promptTimer)   clearTimeout(promptTimer);
    if (responseTimer) clearTimeout(responseTimer);
    removeHighlight();
    overlay.destroy();
  });

  function readText(el: HTMLElement): string {
    return (el as HTMLTextAreaElement).value ?? el.innerText ?? el.textContent ?? "";
  }

  let pollAbort: AbortController | null = null;

  async function pollAnalysis(id: string, tries = 6, baseMs = 600) {
    if (pollAbort) pollAbort.abort();
    pollAbort = new AbortController();
    const { signal } = pollAbort;
    for (let i = 0; i < tries; i++) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const r = await getAnalysis(id);
      if (!r.status || r.status === "done")   return r;
      if (r.status === "unavailable")         throw new Error("Backend unavailable");
      await sleep(baseMs * Math.pow(2, i), signal);
    }
    return getAnalysis(id);
  }

  function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((res, rej) => {
      const t = setTimeout(res, ms);
      signal?.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("Aborted", "AbortError")); });
    });
  }
}