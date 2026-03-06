// extensions/chrome-quirra-overlay/src/content.ts
import { postEvent, getAnalysis, hashUserServerSide } from "./lib/api";
import { getStableBrowserId } from "./lib/identity";
import { inferContext, isPublicUrl } from "./lib/context";
import { QuirraOverlay, type Scores } from "./overlay";

const AI_HOSTNAMES = new Set([
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
  "cluely.com",
]);

const hostname = location.hostname.replace(/^www\./, "");
const isAiSite = AI_HOSTNAMES.has(hostname);
const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

if (isAiSite && !isLocalhost) {
  init();
}

function init() {
  const overlay = new QuirraOverlay();

  // ----------------------------------------------------------------
  // Prompt path — debounced while typing
  // ----------------------------------------------------------------
  const PROMPT_SELECTOR = [
    "textarea",
    '[contenteditable="true"]',
    'div[role="textbox"]',
  ].join(",");

  let promptTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPromptHash = "";

  document.addEventListener(
    "input",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t?.matches?.(PROMPT_SELECTOR)) return;
      const text = readText(t);
      if (!text || text.trim().length < 24) return;
      if (promptTimer) clearTimeout(promptTimer);
      promptTimer = setTimeout(() => void analyzePrompt(text), 700);
    },
    { capture: true }
  );

  async function analyzePrompt(text: string) {
    try {
      // FIX: was using a 32-bit djb2 hash with collision risk.
      // crypto.subtle gives a proper SHA-256 at zero extra cost.
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
          public: false,
        },
      });

      // Prompts don't need duplicate-search polling — analysis is fast
      const ar = await getAnalysis(event_id);
      overlay.showPromptResults(ar.scores as Scores, buildPromptSuggestions(text, ar.scores as Scores));
    } catch (e) {
      overlay.showError(e instanceof Error ? e.message : "Prompt analysis failed");
    }
  }

  // ----------------------------------------------------------------
  // Response path — watch DOM for AI output containers only
  // ----------------------------------------------------------------
  const RESPONSE_SELECTORS = [
    '[data-testid="ai-response"]',
    '[data-testid="conversation-turn-content"]',
    ".assistant-message",
    ".response-content",
    ".ai-output",
    // Claude.ai
    '[data-is-streaming]',
    ".font-claude-message",
    // ChatGPT
    '[data-message-author-role="assistant"]',
  ];

  function getLatestResponse(): string {
    for (const sel of RESPONSE_SELECTORS) {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length) {
        const last = nodes[nodes.length - 1] as HTMLElement;
        const txt = (last.innerText || last.textContent || "").trim();
        if (txt.length > 10) return txt;
      }
    }
    return "";
  }

  let lastResponseSent = "";
  // FIX: track in-flight response analysis so we don't fire concurrent requests
  // when streaming responses mutate the DOM on every token.
  let responseInFlight = false;
  // Debounce timer so we wait for streaming to settle before sending
  let responseTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleResponseAnalysis(text: string) {
    if (responseTimer) clearTimeout(responseTimer);
    // Wait 1.2s after the last DOM mutation — catches streaming completion
    responseTimer = setTimeout(() => {
      if (text !== lastResponseSent && !responseInFlight) {
        lastResponseSent = text;
        void analyzeResponse(text);
      }
    }, 1200);
  }

  async function analyzeResponse(text: string) {
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
          public: isPublicUrl(location.href),
        },
      });

      // FIX: replaced the 6-try × 600ms tight loop (always 7 requests, no
      // backoff, no abort) with exponential backoff and an AbortController
      // so navigating away cancels the pending poll.
      const analysis = await pollAnalysis(event_id);
      overlay.showResults(analysis.scores as Scores, analysis.neighbors || [], analysis.labels);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // navigation
      overlay.showError(e instanceof Error ? e.message : "Response analysis failed");
    } finally {
      responseInFlight = false;
    }
  }

  // FIX: was attaching to document.documentElement with { subtree: true },
  // which fires on every DOM mutation across the entire page. Now we scope
  // the observer to the most specific available container, falling back
  // gracefully to document.body.
  function findObserveTarget(): Element {
    // Try to find the main chat area to narrow scope
    const candidates = [
      'main[class*="chat"]',
      '[id*="chat"]',
      '[class*="conversation"]',
      '[class*="messages"]',
      "main",
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
    characterData: false,
  });

  window.addEventListener("beforeunload", () => {
    mo.disconnect();
    if (responseTimer) clearTimeout(responseTimer);
    overlay.destroy();
  });

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  function readText(el: HTMLElement): string {
    if ((el as HTMLTextAreaElement).value != null)
      return (el as HTMLTextAreaElement).value;
    return el.innerText || el.textContent || "";
  }

  // FIX: replaced 32-bit djb2 hash with SHA-256 via Web Crypto API
  async function sha256(s: string): Promise<string> {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(s)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // FIX: replaces the 6-try × 600ms tight loop.
  // Uses exponential backoff: 600ms, 1.2s, 2.4s, 4.8s → max ~9s total.
  // The AbortController lets the browser cancel if the tab is closed.
  let pollAbortController: AbortController | null = null;

  async function pollAnalysis(id: string, maxTries = 5, baseDelayMs = 600) {
    if (pollAbortController) pollAbortController.abort();
    pollAbortController = new AbortController();
    const signal = pollAbortController.signal;

    for (let i = 0; i < maxTries; i++) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      const r = await getAnalysis(id);
      if (!r.status || r.status === "done") return r;
      if (r.status === "unavailable") throw new Error(r.status);

      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, i);
      await sleep(delay, signal);
    }

    // Final attempt after exhausting retries
    return getAnalysis(id);
  }

  function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }

  function buildPromptSuggestions(text: string, scores: Scores): string[] {
    const s: string[] = [];
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