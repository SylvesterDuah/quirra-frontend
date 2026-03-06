// apps/dashboard-next/src/lib/api.ts
export type Neighbor = {
  event_id: string;
  when?: string;
  context?: string | null;
  url?: string | null;
  similarity?: number;
};

export type AnalysisResponse = {
  status?: "pending" | "done" | "unavailable";
  event_id: string;
  scores: {
    duplication_pct: number;
    style_pct: number;
    risk: number;
    seen_count: number;
    kind?: "prompt" | "response";
  };
  neighbors: Neighbor[];
  labels?: string[];      
  created_at?: string;
};

const PROXY_BASE = "/api/quirra";

const SECRET = process.env.NEXT_PUBLIC_API_SECRET || "";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(SECRET ? { "X-Quirra-Secret": SECRET } : {}),
    ...extra,
  };
}

export async function hashUserServerSide(userId: string): Promise<string> {
  const r = await fetch(`${PROXY_BASE}/v1/hash`, {
    method: "POST",
    headers: headers(),
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
  const r = await fetch(`${PROXY_BASE}/v1/events`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Post failed");
  return j as { event_id: string };
}

export async function getAnalysis(eventId: string): Promise<AnalysisResponse> {
  const r = await fetch(`${PROXY_BASE}/v1/events/${eventId}/analysis`, {
    headers: headers(),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Analysis fetch failed");
  return j as AnalysisResponse;
}