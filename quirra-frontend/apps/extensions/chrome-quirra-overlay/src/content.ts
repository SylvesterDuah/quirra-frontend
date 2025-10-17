// extensions/chrome-quirra-overlay/src/content.ts
import { postEvent, getAnalysis, hashUserServerSide } from "./lib/api";
import { getStableBrowserId } from "./lib/identity";
import { inferContext, isPublicUrl } from "./lib/context";
import { QuirraOverlay, type Scores } from "./overlay";

if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  const overlay = new QuirraOverlay();

  // ----- Prompt path (debounced while typing) -----
  const PROMPT_SELECTOR = ['textarea', '[contenteditable="true"]', 'div[role="textbox"]'].join(",");
  let promptTimer: number | null = null;
  let lastPromptHash = "";

  document.addEventListener(
    "input",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.matches?.(PROMPT_SELECTOR)) return;
      const text = readText(t);
      if (!text || text.trim().length < 24) return;
      if (promptTimer) window.clearTimeout(promptTimer);
      promptTimer = window.setTimeout(() => void analyzePrompt(text), 700);
    },
    { capture: true }
  );

  async function analyzePrompt(text: string) {
    try {
      const canon = text.replace(/\s+/g, " ").trim().toLowerCase();
      const hash = simpleHash(canon);
      if (hash === lastPromptHash) return;
      lastPromptHash = hash;

      overlay.showPromptAnalyzing();

      const stableId = await getStableBrowserId();
      const user_hash = await hashUserServerSide(stableId);

      const { event_id } = await postEvent({
        kind: "prompt",
        content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: false },
      });

      const ar = await getAnalysis(event_id);
      const scores = ar.scores as Scores;
      const suggestions = buildPromptSuggestions(text, scores);
      overlay.showPromptResults(scores, suggestions);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      overlay.showError(msg || "Prompt analysis failed");
    }
  }

  // ----- Response path (watch DOM) -----
  const RESPONSE_SELECTORS = ['[data-testid="ai-response"]', ".assistant-message", ".response", ".ai-output"];
  function getLatestResponse(): string {
    for (const sel of RESPONSE_SELECTORS) {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length) {
        const last = nodes[nodes.length - 1] as HTMLElement;
        const txt = last.innerText || last.textContent || "";
        if (txt.trim().length > 10) return txt.trim();
      }
    }
    return "";
  }

  let lastResponseSent = "";
  async function analyzeResponse(text: string) {
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

      const analysis = await waitForAnalysis(event_id, 6, 600);
      overlay.showResults(analysis.scores as Scores, analysis.neighbors || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      overlay.showError(msg || "Response analysis failed");
    }
  }

  const mo = new MutationObserver(() => {
    const text = getLatestResponse();
    if (text && text !== lastResponseSent) {
      lastResponseSent = text;
      void analyzeResponse(text);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("beforeunload", () => {
    mo.disconnect();
    overlay.destroy();
  });

  // helpers
  function readText(el: HTMLElement): string {
    if ((el as HTMLTextAreaElement).value != null) return (el as HTMLTextAreaElement).value;
    return el.innerText || el.textContent || "";
  }
  function simpleHash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
  async function waitForAnalysis(id: string, tries: number, delayMs: number) {
    for (let i = 0; i < tries; i++) {
      const r = await getAnalysis(id);
      if (!r.status || r.status === "done") return r;
      await sleep(delayMs);
    }
    return await getAnalysis(id);
  }

  function buildPromptSuggestions(text: string, scores: Scores): string[] {
    const s: string[] = [];
    const t = text.trim();
    if (t.length < 80) s.push("Add specifics: audience, domain, constraints, and examples.");
    if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective.");
    if (!/\bn\b|\bwords?\b|\bsteps?\b|\bformat\b|\bstyle\b/i.test(t)) s.push("Specify length, format, and writing style.");
    if (/\bjailbreak|\bbypass|\bignore\b.*(rules|instructions)/i.test(t)) s.push("Remove jailbreak cues or policy-bypassing language.");
    if (scores.style_pct > 70) s.push("Vary sentence structure and avoid boilerplate phrases.");
    if (!s.length) s.push("Nice prompt. You can refine with target, style and constraints if needed.");
    return s;
  }
}



