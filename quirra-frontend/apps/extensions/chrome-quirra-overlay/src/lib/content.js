(function () {
  // Avoid running inside iframes or multiple times
  if (window.top !== window) return;
  if (document.querySelector("quirra-overlay-host")) return;

  let BASE = "http://127.0.0.1:8000";
  let SECRET = "";
  chrome.storage.sync.get(["baseUrl", "secret"], (cfg) => {
    BASE = cfg.baseUrl || BASE;
    SECRET = cfg.secret || SECRET;
  });

  const host = document.createElement("quirra-overlay-host");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host{ all: initial; }
    .wrap{ position: fixed; right:16px; bottom:16px; width:360px; z-index:2147483647; pointer-events:none; }
    .panel{ backdrop-filter: blur(10px); background: rgba(18,18,24,0.35); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 12px; color:#e8e8ee; box-shadow: 0 10px 40px rgba(0,0,0,0.35); }
    .panel h4{ margin:0 0 6px; font: 600 14px/1.2 system-ui; letter-spacing: .2px; }
    .row{ font: 13px/1.4 system-ui; opacity:.95; }
    .bad{ color:#ff8383 } .warn{ color:#ffd36e } .good{ color:#7dffa3 } .muted{ opacity:.7 }
    .kbd{ font:12px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; opacity:.7 }
    .panel:hover .kbd{ opacity:1 }
    .interactive{ pointer-events:auto; }
  `;
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  wrap.innerHTML = `<div class="panel"><h4>Quirra</h4><div class="row muted">Watching…</div><div class="row muted kbd">Hold <b>Alt</b> to interact</div></div>`;
  shadow.appendChild(style);
  shadow.appendChild(wrap);
  document.documentElement.appendChild(host);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Alt") wrap.classList.add("interactive");
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "Alt") wrap.classList.remove("interactive");
  });

  let lastPrompt = "";
  let lastEventId = null;
  let t;

  function getActivePrompt() {
    const a = document.activeElement;
    if (a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT")) return a.value || "";
    if (a && a.isContentEditable) return a.innerText || a.textContent || "";
    const gpt = document.querySelector('textarea, div[contenteditable="true"][data-id]');
    if (gpt) return gpt.value || gpt.innerText || gpt.textContent || "";
    return "";
  }

  function getLatestAIResponse() {
    const nodes = Array.from(
      document.querySelectorAll('article, div[class*="message"], div[class*="assistant"], .prose')
    );
    const texts = nodes
      .map((n) => ({ n, t: (n.innerText || "").trim(), h: n.offsetHeight, w: n.offsetWidth }))
      .filter((x) => x.t && x.h > 60 && x.w > 200);
    texts.sort((a, b) => b.h * b.w - a.h * a.w);
    return texts[0]?.t || "";
  }

  function postEvent(kind, content, meta) {
    const body = JSON.stringify({ kind, content, metadata: meta || {} });
    const headers = { "Content-Type": "application/json" };
    if (SECRET) headers["X-Quirra-Secret"] = SECRET;
    return fetch(`${BASE}/v1/events`, { method: "POST", headers, body })
      .then((r) => r.json())
      .catch(() => null);
  }

  async function analyzeLoop() {
    const prompt = getActivePrompt();
    if (prompt && prompt !== lastPrompt) {
      lastPrompt = prompt;
      const res = await postEvent("prompt", prompt, { url: location.href });
      lastEventId = res?.event_id || null;
      updatePanel("Analyzing prompt…");
      if (lastEventId) pollAnalysis(lastEventId);
    }
    clearTimeout(t);
    t = setTimeout(analyzeLoop, 900);
  }

  async function pollAnalysis(eventId) {
    const headers = {};
    if (SECRET) headers["X-Quirra-Secret"] = SECRET;
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 600));
      try {
        const r = await fetch(`${BASE}/v1/events/${eventId}/analysis`, { headers });
        const data = await r.json();
        if (data && data.scores) {
          renderAnalysis(data);
          return;
        }
      } catch {}
    }
    updatePanel("No analysis yet.");
  }

  setInterval(async () => {
    const reply = getLatestAIResponse();
    if (!reply) return;
    const res = await postEvent("response", reply, { url: location.href });
    const id = res?.event_id;
    if (!id) return;
    const headers = {};
    if (SECRET) headers["X-Quirra-Secret"] = SECRET;
    setTimeout(async () => {
      try {
        const r = await fetch(`${BASE}/v1/events/${id}/analysis`, { headers });
        const data = await r.json();
        if (data && data.scores) renderAnalysis(data);
      } catch {}
    }, 800);
  }, 3500);

  function updatePanel(msg) {
    const row = shadow.querySelector(".panel .row");
    if (!row) return;
    const d = document.createElement("div");
    d.className = "row muted";
    d.textContent = msg;
    row.replaceWith(d);
  }

  function renderAnalysis(a) {
    const { dup_score, style_sameness, policy_hits, risk, seen_count } = a.scores || {};
    const labels = a.labels || [];
    const recs = [];
    if ((dup_score || 0) > 0.7) recs.push("Restructure outline, swap phrasing, add specifics.");
    if ((style_sameness || 0) > 0.7) recs.push("Vary sentence lengths and add concrete nouns.");
    if ((policy_hits || []).includes("academic_prompt")) recs.push("Use your own synthesis; cite sources.");

    const html = `
      <div class="row">Risk: <b class="${risk > 0.75 ? "bad" : risk > 0.45 ? "warn" : "good"}">${(risk * 100) | 0}%</b>
        <span class="muted"> · dup:${Math.round((dup_score || 0) * 100)}% · style:${Math.round((style_sameness || 0) * 100)}% · seen:${seen_count || 0}</span>
      </div>
      ${labels.length ? `<div class="row">Labels: ${labels.join(", ")}</div>` : ""}
      ${recs.length ? `<div class="row">Suggestions: ${recs.join(" • ")}</div>` : ""}
      <div class="row muted kbd">Hold <b>Alt</b> to click and copy suggestions.</div>
    `;
    const panel = shadow.querySelector(".panel");
    panel.innerHTML = `<h4>Quirra</h4>` + html;
  }

  analyzeLoop();
})();
