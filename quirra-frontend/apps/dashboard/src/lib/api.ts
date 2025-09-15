// quirra-frontend/apps/dashboard/src/lib/api.ts
export type Settings = { backend: string; secret?: string };

function hasChrome(): boolean {
  // TS safe guard for situations where this file is opened in non-extension envs
  return typeof chrome !== "undefined" && !!chrome.storage?.sync;
}

async function getSettings(): Promise<Settings> {
  if (hasChrome()) {
    return new Promise((res) =>
      chrome.storage.sync.get({ backend: "", secret: "" }, (v) =>
        res({ backend: v.backend || "", secret: v.secret || "" })
      )
    );
  }
  // Fallback so the file type-checks if opened in a web app
  const backend = localStorage.getItem("quirra_backend") || "";
  const secret = localStorage.getItem("quirra_secret") || "";
  return { backend, secret };
}

export async function hashUserServerSide(userId: string): Promise<string> {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    body: JSON.stringify({ user_id: userId }),
  });
  const j = (await r.json()) as { user_hash?: string; detail?: string };
  if (!r.ok) throw new Error(j?.detail || "hash failed");
  return j.user_hash as string;
}

export async function postEvent(payload: {
  project?: string;
  kind: "prompt" | "response";
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<{ event_id: string }> {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    body: JSON.stringify(payload),
  });
  const j = (await r.json()) as { event_id?: string; detail?: string };
  if (!r.ok) throw new Error(j?.detail || "post event failed");
  return j as { event_id: string };
}

export type Neighbor = {
  event_id: string;
  when?: string;
  context?: string | null;
  url?: string | null;
  similarity?: number;
};

export type AnalysisResponse = {
  status?: "pending" | "done";
  event_id: string;
  scores: { duplication_pct: number; style_pct: number; risk: number; seen_count: number };
  neighbors: Neighbor[];
  created_at?: string;
};

export async function getAnalysis(eventId: string): Promise<AnalysisResponse> {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
    headers: { ...(secret ? { "X-Quirra-Secret": secret } : {}) },
  });
  const j = (await r.json()) as AnalysisResponse & { detail?: string };
  if (!r.ok) throw new Error(j?.detail || "analysis fetch failed");
  return j;
}
