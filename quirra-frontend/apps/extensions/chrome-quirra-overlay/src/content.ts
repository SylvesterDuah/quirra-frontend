// extensions/chrome-quirra-overlay/src/content.ts

import { postEvent, getAnalysis, getCachedUserHash } from "./lib/api";
import { inferContext, isPublicUrl } from "./lib/context";
import { QuirraOverlay, type Scores } from "./overlay";

// ─── AI site allowlist ────────────────────────────────────────────────────────
const AI_HOSTNAMES = new Set([
  "chat.openai.com", "chatgpt.com",
  "claude.ai",
  "gemini.google.com", "bard.google.com",
  "copilot.microsoft.com",
  "you.com", "perplexity.ai", "poe.com",
  "character.ai", "mistral.ai", "chat.mistral.ai",
  "huggingface.co",
]);

const hostname  = location.hostname.replace(/^www\./, "");
const isAiSite  = AI_HOSTNAMES.has(hostname);
const isLocal   = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

if (isAiSite && !isLocal) init();

// ─── LOCAL SCORER ─────────────────────────────────────────────────────────────
// Runs entirely in the content script. Zero network, zero latency.

const RISK_TERMS = [
  "bypass", "jailbreak", "exploit", "ignore previous instructions",
  "ignore all instructions", "phishing", "malware", "weapon",
  "bomb", "poison", "harm", "kill", "deepfake", "hack", "dox",
  "password", "racist", "sexist", "hate speech",
];
const LM_TELLS = ["as an ai", "as a language model", "cannot assist with that"];

function localScore(text: string): Scores {
  const t     = (text || "").toLowerCase();
  const words = t.match(/[a-z0-9']+/g) || [];
  const len   = words.length;

  // Style: type-token ratio
  const ttr       = len > 0 ? new Set(words).size / len : 1;
  const style_pct = Math.round(Math.max(0, Math.min(100, (1 - ttr) * 150)));

  // Risk: policy term hits + jailbreak + LM refusal tells
  const hits      = RISK_TERMS.filter(w => t.includes(w)).length;
  const jailbreak = /ignore (previous|all) instructions|bypass|jailbreak/.test(t) ? 1 : 0;
  const lm_tell   = LM_TELLS.some(p => t.includes(p)) ? 1 : 0;
  const risk      = Math.round(Math.min(100, hits * 12 + jailbreak * 30 + lm_tell * 10));

  return { duplication_pct: 0, style_pct, risk, seen_count: 0 };
}

function localSuggestions(text: string, scores: Scores): string[] {
  const s: string[] = [];
  const t = text.trim();
  if (t.length < 80)  s.push("Add specifics: audience, domain, and constraints.");
  if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective.");
  if (!/\bformat\b|\bstyle\b|\bwords?\b|\bsteps?\b/i.test(t))
    s.push("Specify the length, format, and writing style you want.");
  if (/jailbreak|bypass|ignore.*instructions/i.test(t))
    s.push("Remove jailbreak or policy-bypass language.");
  if (scores.style_pct > 70)
    s.push("Vary sentence structure — high style repetition detected.");
  if (scores.risk > 60)
    s.push("High risk score — review for policy-sensitive content.");
  if (!s.length) s.push("Looks good. Add target audience and constraints to refine.");
  return s;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  const overlay = new QuirraOverlay();

  // Warm up cached hash + settings immediately on page load so the first
  // background call has zero cold-start overhead on the extension side.
  getCachedUserHash().catch(() => {});

  // ── PROMPT pipeline ───────────────────────────────────────────────────────

  const PROMPT_SEL = [
    "textarea",
    '[contenteditable="true"]',
    'div[role="textbox"]',
  ].join(",");

  let promptDebounce: ReturnType<typeof setTimeout> | null = null;
  let lastRemoteHash = "";

  document.addEventListener("input", (e) => {
    const el = e.target as HTMLElement | null;
    if (!el?.matches?.(PROMPT_SEL)) return;
    const text = readText(el);
    if (!text || text.trim().length < 24) return;

    // ── INSTANT: show local scores immediately, no waiting ────────────────
    const instant      = localScore(text);
    const suggestions  = localSuggestions(text, instant);
    overlay.showPromptResults(instant, suggestions, true);

    // ── BACKGROUND: debounce remote call, doesn't block UI ───────────────
    if (promptDebounce) clearTimeout(promptDebounce);
    promptDebounce = setTimeout(() => void remotePrompt(text), 1000);
  }, { capture: true });

  async function remotePrompt(text: string) {
    try {
      const hash = await sha256(text.trim().toLowerCase().replace(/\s+/g, " "));
      if (hash === lastRemoteHash) return;
      lastRemoteHash = hash;

      const user_hash  = await getCachedUserHash();
      const { event_id } = await postEvent({
        kind: "prompt", content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: false },
      });
      const ar = await getAnalysis(event_id);
      // Silently upgrade the overlay with server scores
      overlay.showPromptResults(
        ar.scores as Scores,
        localSuggestions(text, ar.scores as Scores),
        false
      );
    } catch (e) {
      // Don't overwrite local result — just append a small warning
      overlay.appendNote(e instanceof Error ? e.message : "Backend unreachable");
    }
  }

  // ── RESPONSE pipeline ─────────────────────────────────────────────────────

  const RESPONSE_SELS = [
    '[data-message-author-role="assistant"]',
    '[data-testid="conversation-turn-content"]',
    ".font-claude-message",
    ".assistant-message",
    ".response-content",
    '[data-testid="ai-response"]',
  ];

  function getLatestResponse(): string {
    for (const sel of RESPONSE_SELS) {
      const nodes = [...document.querySelectorAll(sel)];
      if (!nodes.length) continue;
      const txt = ((nodes.at(-1) as HTMLElement).innerText || "").trim();
      if (txt.length > 10) return txt;
    }
    return "";
  }

  let lastResponseText  = "";
  let responseInFlight  = false;
  let responseDebounce: ReturnType<typeof setTimeout> | null = null;

  function onResponseMutation() {
    const text = getLatestResponse();
    if (!text) return;

    // ── INSTANT: show local score for the response immediately ───────────
    const instant = localScore(text);
    overlay.showResults(instant, [], [], true);

    // ── BACKGROUND: wait for streaming to settle, then send to backend ───
    if (responseDebounce) clearTimeout(responseDebounce);
    responseDebounce = setTimeout(() => {
      if (text !== lastResponseText && !responseInFlight) {
        lastResponseText = text;
        void remoteResponse(text);
      }
    }, 1200);
  }

  async function remoteResponse(text: string) {
    responseInFlight = true;
    try {
      const user_hash     = await getCachedUserHash();
      const { event_id }  = await postEvent({
        kind: "response", content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: isPublicUrl(location.href) },
      });
      const analysis = await pollAnalysis(event_id);
      overlay.showResults(
        analysis.scores as Scores,
        analysis.neighbors || [],
        analysis.labels   || [],
        false
      );
    } catch (e) {
      overlay.appendNote(e instanceof Error ? e.message : "Backend unreachable");
    } finally {
      responseInFlight = false;
    }
  }

  // Scope observer to chat container — never document root
  function chatContainer(): Element {
    for (const sel of ["main", '[role="main"]', '[class*="chat"]', '[class*="conversation"]']) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  const mo = new MutationObserver(onResponseMutation);
  mo.observe(chatContainer(), { childList: true, subtree: true, attributes: false, characterData: false });

  window.addEventListener("beforeunload", () => {
    mo.disconnect();
    if (promptDebounce)   clearTimeout(promptDebounce);
    if (responseDebounce) clearTimeout(responseDebounce);
    overlay.destroy();
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function readText(el: HTMLElement): string {
    return (el as HTMLTextAreaElement).value ?? el.innerText ?? el.textContent ?? "";
  }

  async function sha256(s: string): Promise<string> {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  let pollAbort: AbortController | null = null;

  async function pollAnalysis(id: string, tries = 6, baseMs = 600) {
    if (pollAbort) pollAbort.abort();
    pollAbort = new AbortController();
    const { signal } = pollAbort;

    for (let i = 0; i < tries; i++) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const r = await getAnalysis(id);
      if (!r.status || r.status === "done")        return r;
      if (r.status === "unavailable")              throw new Error("Backend unavailable");
      await sleep(baseMs * Math.pow(2, i), signal); // 600 → 1.2s → 2.4s → 4.8s → 9.6s
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