// ====== tiny settings helpers ======
async function getSettings() {
  const v = await chrome.storage.sync.get({ backend: "", secret: "" });
  return { backend: v.backend || "", secret: v.secret || "" };
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
  const existing = await chrome.storage.local.get(key);
  if (existing[key]) return String(existing[key]);
  const id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
  await chrome.storage.local.set({ [key]: id });
  return id;
}

// ====== backend API helpers ======
async function hashUserServerSide(userId) {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
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
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Post failed");
  return j.event_id;
}
async function getAnalysis(eventId) {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
    headers: { ...(secret ? { "X-Quirra-Secret": secret } : {}) }
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Analysis failed");
  return j;
}

// ====== overlay UI (non-blocking; hold Alt to interact) ======
class QuirraOverlay {
  constructor() {
    this.root = document.createElement("div");
    this.root.className = "quirra-overlay";
    this.root.setAttribute("aria-live", "polite");
    this.content = document.createElement("div");
    this.content.className = "quirra-card";
    this.root.appendChild(this.content);
    this.mounted = false;
  }
  mount() {
    if (this.mounted) return;
    this.injectStyles();
    document.body.appendChild(this.root);
    this.mounted = true;
    const onDown = (e) => { if (e.altKey) document.documentElement.classList.add("quirra-alt"); };
    const onUp   = () => { document.documentElement.classList.remove("quirra-alt"); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onUp);
  }
  destroy() { this.root.remove(); document.documentElement.classList.remove("quirra-alt"); this.mounted = false; }
  showAnalyzing(label) {
    this.mount();
    this.content.innerHTML = `
      <div class="qr-head">Quirra ${label ? "— " + esc(label) : ""}</div>
      <div class="qr-row"><span class="qr-dot"></span><span>Analyzing…</span></div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
  }
  showPromptResults(scores, suggestions) {
    this.mount();
    const riskCls = scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";
    const sugList = (suggestions || []).map(s => `<li>• ${esc(s)}</li>`).join("") || "<li>• Looks good!</li>";
    this.content.innerHTML = `
      <div class="qr-head">Quirra — Prompt health</div>
      <div class="qr-metrics"><div>Risk: <b class="${riskCls}">${scores.risk}%</b>
      <span class="qr-sub"> · style ${scores.style_pct}%</span></div></div>
      <div class="qr-section"><div class="qr-title">Suggestions</div>
      <ul class="qr-list">${sugList}</ul></div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
  }
  showResults(scores, neighbors) {
    this.mount();
    const riskCls = scores.risk >= 75 ? "qr-red" : scores.risk >= 45 ? "qr-amber" : "qr-green";
    const list = (neighbors || []).slice(0, 5).map(n => {
      const sim = n.similarity != null ? ` · sim ${(n.similarity * 100).toFixed(0)}%` : "";
      const ctx = n.context ? ` · ${esc(n.context)}` : "";
      const when = n.when ? ` · ${esc(timeAgo(n.when))}` : "";
      const ref = n.url ? ` · <a href="${attr(n.url)}" target="_blank" rel="noopener noreferrer">ref</a>` : "";
      return `<li>• ${esc(String(n.event_id||"").slice(0,8))}${ctx}${when}${sim}${ref}</li>`;
    }).join("");
    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-metrics"><div>Risk: <b class="${riskCls}">${scores.risk}%</b>
        <span class="qr-sub"> · dup ${scores.duplication_pct}% · style ${scores.style_pct}% · seen ${scores.seen_count}</span>
      </div></div>
      <div class="qr-section"><div class="qr-title">Near matches</div>
        ${list ? `<ul class="qr-list">${list}</ul>` : `<div class="qr-sub">None found</div>`}
      </div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
  }
  showError(msg) {
    this.mount();
    this.content.innerHTML = `
      <div class="qr-head">Quirra</div>
      <div class="qr-err">⚠️ ${esc(msg || "Something went wrong")}</div>
      <div class="qr-hint">Hold <b>Alt</b> to interact</div>`;
  }
  injectStyles() {
    if (document.getElementById("quirra-overlay-styles")) return;
    const css = `
      .quirra-overlay{position:fixed;right:18px;bottom:18px;z-index:2147483646;pointer-events:none}
      html.quirra-alt .quirra-overlay{pointer-events:auto}
      .quirra-card{min-width:280px;max-width:min(380px,92vw);border-radius:14px;border:1px solid rgba(255,255,255,.18);
        background:rgba(18,18,24,.45);backdrop-filter:blur(10px);color:#fff;padding:10px 12px;
        font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.35)}
      .qr-head{font-weight:650;margin-bottom:6px;font-size:13px;letter-spacing:.2px}
      .qr-row{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.85)}
      .qr-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.9);animation:qrPulse 1s infinite alternate}
      @keyframes qrPulse{from{opacity:.25}to{opacity:.9}}
      .qr-hint{margin-top:6px;font-size:11px;color:rgba(255,255,255,.6)}
      .qr-err{color:#ffd166}
      .qr-metrics{margin:2px 0 6px 0}
      .qr-sub{color:rgba(255,255,255,.6)}
      .qr-title{font-weight:600;margin-bottom:4px}
      .qr-section{margin-top:6px}
      .qr-list{margin:0;padding-left:14px;color:rgba(255,255,255,.88)}
      .qr-green{color:#34d399}.qr-amber{color:#f59e0b}.qr-red{color:#f87171}
      .quirra-card a{color:#a5b4fc;text-decoration:underline}
    `;
    const el = document.createElement("style"); el.id = "quirra-overlay-styles"; el.textContent = css; document.head.appendChild(el);
  }
}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function attr(s){return esc(s)}
function timeAgo(iso){
  if(!iso) return ""; const then = new Date(iso).getTime(); if(Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now()-then); const mins = Math.floor(diff/60000);
  if(mins<1) return "just now"; if(mins<60) return `${mins}m ago`; const hrs=Math.floor(mins/60);
  if(hrs<24) return `${hrs}h ago`; const days=Math.floor(hrs/24); return `${days}d ago`;
}

// ====== main watchers ======
(function main(){
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  const overlay = new QuirraOverlay();

  // PROMPT listening (debounced)
  const PROMPT_SELECTOR = ['textarea','[contenteditable="true"]','div[role="textbox"]'].join(",");
  let promptTimer = null, lastPromptHash = "";
  document.addEventListener("input", (e) => {
    const t = e.target; if (!t || !t.matches?.(PROMPT_SELECTOR)) return;
    const text = readText(t); if (!text || text.trim().length < 24) return;
    if (promptTimer) clearTimeout(promptTimer);
    promptTimer = setTimeout(() => analyzePrompt(text), 700);
  }, { capture: true });

  async function analyzePrompt(text) {
    try {
      const canon = text.replace(/\s+/g," ").trim().toLowerCase();
      const hash = simpleHash(canon);
      if (hash === lastPromptHash) return;
      lastPromptHash = hash;

      overlay.showAnalyzing("Prompt health");
      const stableId  = await getStableBrowserId();
      const user_hash = await hashUserServerSide(stableId);
      const event_id  = await postEvent({
        kind: "prompt",
        content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: false }
      });
      const ar = await getAnalysis(event_id);
      const scores = ar.scores || { risk:0, style_pct:0 };
      const suggestions = buildPromptSuggestions(text, scores);
      overlay.showPromptResults(scores, suggestions);
    } catch (e) { overlay.showError(e?.message || "Prompt analysis failed"); }
  }

  // RESPONSE listening (DOM watch)
  const RESPONSE_SELECTORS = ['[data-testid="ai-response"]', '.assistant-message', '.response', '.ai-output'];
  let lastResponseSent = "";
  const mo = new MutationObserver(() => {
    const txt = getLatestResponse();
    if (txt && txt !== lastResponseSent) { lastResponseSent = txt; analyzeResponse(txt); }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  async function analyzeResponse(text) {
    try {
      overlay.showAnalyzing();
      const stableId  = await getStableBrowserId();
      const user_hash = await hashUserServerSide(stableId);
      const event_id  = await postEvent({
        kind: "response",
        content: text,
        metadata: { user_hash, url: location.href, context: inferContext(text), public: isPublicUrl(location.href) }
      });
      const analysis = await waitForAnalysis(event_id, 6, 600);
      overlay.showResults(analysis.scores || { risk:0, duplication_pct:0, style_pct:0, seen_count:0 }, analysis.neighbors || []);
    } catch (e) { overlay.showError(e?.message || "Response analysis failed"); }
  }

  window.addEventListener("beforeunload", () => { mo.disconnect(); overlay.destroy(); });

  // helpers
  function readText(el){ if (el && typeof el.value === "string") return el.value; return el.innerText || el.textContent || ""; }
  function getLatestResponse(){
    for (const sel of RESPONSE_SELECTORS) {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length) {
        const last = nodes[nodes.length-1]; const txt = (last.innerText || last.textContent || "");
        if (txt.trim().length > 10) return txt.trim();
      }
    } return "";
  }
  function simpleHash(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return String(h>>>0); }
  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function waitForAnalysis(id, tries, delayMs){
    for (let i=0;i<tries;i++){ const r = await getAnalysis(id); if (!r.status || r.status === "done") return r; await sleep(delayMs); }
    return await getAnalysis(id);
  }
  function buildPromptSuggestions(text, scores){
    const s=[], t=(text||"").trim();
    if (t.length < 80) s.push("Add specifics: audience, domain, constraints, and examples.");
    if (!/[?.!]/.test(t)) s.push("Ask as a clear question or add an objective.");
    if (!/\bn\b|\bwords?\b|\bsteps?\b|\bformat\b|\bstyle\b/i.test(t)) s.push("Specify length, format, and writing style.");
    if (/\bjailbreak|\bbypass|\bignore\b.*(rules|instructions)/i.test(t)) s.push("Remove jailbreak cues or policy-bypassing language.");
    if ((scores?.style_pct||0) > 70) s.push("Vary sentence structure and avoid boilerplate phrases.");
    if (!s.length) s.push("Nice prompt. You can refine with target, style and constraints if needed.");
    return s;
  }
})();
