// quirra-frontend/apps/dashboard-next/src/content.ts
import { postEvent, hashUserServerSide, getAnalysis, type AnalysisResponse } from "./lib/api";
import { getStableBrowserId } from "./lib/identity";
import { inferContext, isPublicUrl } from "./lib/context";
import { QuirraOverlay } from "./overlay";

if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  const overlay = new QuirraOverlay();

  async function sendAndAnalyze(responseText: string) {
    try {
      overlay.showAnalyzing();

      const stableId = await getStableBrowserId();
      const user_hash = await hashUserServerSide(stableId);

      const { event_id } = await postEvent({
        kind: "response",
        content: responseText,
        metadata: {
          user_hash,
          url: location.href,
          context: inferContext(responseText),
          public: isPublicUrl(location.href),
        },
      });

      const analysis = await waitForAnalysis(event_id, 6, 600);
      overlay.showResults(analysis.scores, analysis.neighbors || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      overlay.showError(msg || "Analysis failed");
    }
  }

  async function waitForAnalysis(eventId: string, maxTries = 6, delayMs = 600): Promise<AnalysisResponse> {
    let last: AnalysisResponse | null = null;
    for (let i = 0; i < maxTries; i++) {
      const res = await getAnalysis(eventId);
      last = res;
      if (!res.status || res.status === "done") return res;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (last) return last;
    throw new Error("Analysis timeout");
  }

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

  let lastSent = "";
  const mo = new MutationObserver(() => {
    const text = getLatestResponse();
    if (text && text !== lastSent) {
      lastSent = text;
      void sendAndAnalyze(text);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("beforeunload", () => {
    mo.disconnect();
    overlay.destroy();
  });
}
