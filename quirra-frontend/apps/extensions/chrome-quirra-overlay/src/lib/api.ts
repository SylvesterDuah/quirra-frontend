// extensions/chrome-quirra-overlay/src/lib/api.ts
type Settings = { backend: string; secret?: string };

async function getSettings(): Promise<Settings> {
  const v = await chrome.storage.sync.get({ backend: "", secret: "" });
  return { backend: v.backend || "", secret: v.secret || "" };
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
  scores: {
    duplication_pct: number;
    style_pct: number;
    risk: number;
    seen_count: number;
    kind?: "prompt" | "response";
  };
  neighbors: Neighbor[];
  created_at?: string;
};

export async function hashUserServerSide(userId: string): Promise<string> {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    body: JSON.stringify({ user_id: userId }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Hash failed");
  return j.user_hash as string;
}

export async function postEvent(payload: {
  project?: string | null;
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
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Post failed");
  return j as { event_id: string };
}

export async function getAnalysis(eventId: string): Promise<AnalysisResponse> {
  const { backend, secret } = await getSettings();
  const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
    headers: { ...(secret ? { "X-Quirra-Secret": secret } : {}) },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Analysis fetch failed");
  return j as AnalysisResponse;
}
