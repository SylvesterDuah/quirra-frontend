// extensions/chrome-quirra-overlay/src/content.ts


import { postEvent, getAnalysis, getCachedUserHash } from "./lib/api";
import { inferContext, isPublicUrl } from "./lib/context";
import { QuirraOverlay, type Scores } from "./overlay";

// Only activate on known AI sites
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
]);

const hostname = location.hostname.replace(/^www\./, "");
const isAiSite = AI_HOSTNAMES.has(hostname);
const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

if (isAiSite && !isLocalhost) {
  init();
}

// ---------------------------------------------------------------------------
// Local instant scoring — runs entirely in the content script, zero latency
// ---------------------------------------------------------------------------

const POLICY_WORDS = [
  "bypass", "jailbreak", "exploit", "phishing", "malware", "weapon",
  "bomb", "poison", "harm", "kill", "deepfake", "hack", "crack",
  "dox", "leak", "pii", "password", "stereotype", "racist", "sexist",
];
const LM_TELLS = ["as an ai", "as a language model", "cannot assist"];

function localScore(text: string): Scores {
  const t = (text || "").toLowerCase();
  const words = t.match(/[a-z0-9']+/g) || [];

  // Type-token ratio → style sameness
  const ttr = words.length > 0 ? new Set(words).size / words.length : 1;
  const style_pct = Math.round(Math.max(0, Math.min(100, (1 - ttr) * 100)));

  // Policy hits → risk
  const hits = POLICY_WORDS.filter(w => t.includes(w)).length;
  const jailbreak = /ignore previous instructions|bypass|jailbreak/.test(t) ? 1 : 0;
  const lm_tell = LM_TELLS.some(p => t.includes(p)) ? 1 : 0;
  const risk = Math.round(Math.min(100, hits * 10 + jailbreak * 25 + lm_tell * 10));

  return { duplication_pct: 0, style_pct, risk, seen_count: 0 };
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------

function init() {
  const overlay = new QuirraOverlay();


  getCachedUserHash().catch(() => {});

  // ---- Prompt path --------------------------------------------------------
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

      // FIX: Show LOCAL scores instantly while the user is still typing —
      // zero network delay, gives immediate feedback on risk and style.
      const instant = localScore(text);
      const suggestions = buildPromptSuggestions(text, instant);
      overlay.showPromptResults(instant, suggestions, true); // true = "local preview"

      // Then debounce the backend call for a full server-side analysis
      if (promptTimer) clearTimeout(promptTimer);
      promptTimer = setTimeout(() => void analyzePromptRemote(text), 300);
    },
    { capture: true }
  );

  async function analyzePromptRemote(text: string) {
    try {
      const hash = await sha256(text.replace(/\s+/g, " ").trim().toLowerCase());
      if (hash === lastPromptHash) return;
      lastPromptHash = hash;

      const user_hash = await getCachedUserHash();
      const { event_id } = await postEvent({
        kind: "prompt",
        content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: false },
      });

      const ar = await getAnalysis(event_id);

      overlay.showPromptResults(ar.scores as Scores, buildPromptSuggestions(text, ar.scores as Scores), false);
    } catch (e) {

      const msg = e instanceof Error ? e.message : String(e);
      overlay.appendBackendError(msg);
    }
  }

  // ---- Response path -------------------------------------------------------
  const RESPONSE_SELECTORS = [
    '[data-testid="ai-response"]',
    '[data-testid="conversation-turn-content"]',
    '[data-message-author-role="assistant"]',
    ".assistant-message",
    ".font-claude-message",
    ".response-content",
    ".ai-output",
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
  let responseInFlight = false;
  let responseTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleResponseAnalysis(text: string) {
    const instant = localScore(text);
    overlay.showResults(instant, [], [], true); // true = "local preview"

    // Debounce the backend call — wait for streaming to settle
    if (responseTimer) clearTimeout(responseTimer);
    responseTimer = setTimeout(() => {
      if (text !== lastResponseSent && !responseInFlight) {
        lastResponseSent = text;
        void analyzeResponseRemote(text);
      }
    }, 800);
  }

  async function analyzeResponseRemote(text: string) {
    responseInFlight = true;
    try {
      const user_hash = await getCachedUserHash();
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

      const analysis = await pollAnalysis(event_id);
      overlay.showResults(
        analysis.scores as Scores,
        analysis.neighbors || [],
        analysis.labels || [],
        false
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      overlay.appendBackendError(msg);
    } finally {
      responseInFlight = false;
    }
  }

  // Scope observer to chat container, not entire document
  function findObserveTarget(): Element {
    for (const sel of ["main", '[role="main"]', '[class*="chat"]', '[class*="conversation"]', '[id*="chat"]']) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  const mo = new MutationObserver(() => {
    const text = getLatestResponse();
    if (text) scheduleResponseAnalysis(text);
  });

  mo.observe(findObserveTarget(), {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  window.addEventListener("beforeunload", () => {
    mo.disconnect();
    if (responseTimer) clearTimeout(responseTimer);
    if (promptTimer) clearTimeout(promptTimer);
    overlay.destroy();
  });

  // ---- Helpers -------------------------------------------------------------

  function readText(el: HTMLElement): string {
    if ((el as HTMLTextAreaElement).value != null)
      return (el as HTMLTextAreaElement).value;
    return el.innerText || el.textContent || "";
  }

  async function sha256(s: string): Promise<string> {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  let pollAbort: AbortController | null = null;

  async function pollAnalysis(id: string, maxTries = 5, baseMs = 500) {
    if (pollAbort) pollAbort.abort();
    pollAbort = new AbortController();
    const { signal } = pollAbort;

    for (let i = 0; i < maxTries; i++) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const r = await getAnalysis(id);
      if (!r.status || r.status === "done") return r;
      if (r.status === "unavailable") throw new Error("Backend unavailable");
      await sleep(baseMs * Math.pow(2, i), signal);
    }
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
    if (!/\bwords?\b|\bsteps?\b|\bformat\b|\bstyle\b/i.test(t))
      s.push("Specify length, format, and writing style.");
    if (/jailbreak|bypass|ignore.*(rules|instructions)/i.test(t))
      s.push("Remove jailbreak cues or policy-bypassing language.");
    if (scores.style_pct > 70)
      s.push("Vary sentence structure and avoid boilerplate phrases.");
    if (!s.length) s.push("Looks good. Add target audience and constraints to refine further.");
    return s;
  }
}