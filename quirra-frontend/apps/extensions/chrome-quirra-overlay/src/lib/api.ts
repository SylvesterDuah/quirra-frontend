// extensions/chrome-quirra-overlay/src/lib/api.ts

type Settings = { backend: string; secret?: string };

// Cache settings — avoids 100-300ms chrome.storage.sync.get on every request
let _settingsCache: Settings | null = null;

async function getSettings(): Promise<Settings> {
  if (_settingsCache) return _settingsCache;
  const v = await chrome.storage.sync.get({ backend: "", secret: "" });
  _settingsCache = {
    backend: (v.backend || "").replace(/\/+$/, ""),
    secret:  v.secret || "",
  };
  chrome.storage.onChanged.addListener(() => { _settingsCache = null; });
  return _settingsCache;
}

function assertBackend(backend: string): void {
  if (!backend) throw new Error(
    "Quirra: backend URL not set. Go to Extension options and enter your backend URL."
  );
}

function auth(secret?: string): Record<string, string> {
  return secret ? { "X-Quirra-Secret": secret } : {};
}

export type Neighbor = {
  event_id:    string;
  when?:       string;
  context?:    string | null;
  url?:        string | null;
  similarity?: number;
};

export type DuplicateAlert = {
  detected:   boolean;
  similarity: number;
  seen_count: number;
  first_seen: string | null;
  source_url: string | null;
  message:    string;
};

export type AnalysisResponse = {
  status?:          "pending" | "done" | "unavailable";
  event_id:         string;
  scores: {
    duplication_pct: number;
    style_pct:       number;
    risk:            number;
    seen_count:      number;
    kind?:           "prompt" | "response";
  };
  neighbors:        Neighbor[];
  labels?:          string[];
  duplicate_alert?: DuplicateAlert | null;
};

export async function hashUserServerSide(userId: string): Promise<string> {
  const { backend, secret } = await getSettings();
  assertBackend(backend);
  const r = await fetch(`${backend}/api/v1/hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth(secret) },
    body: JSON.stringify({ user_id: userId }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Hash failed");
  return j.user_hash as string;
}

export async function postEvent(payload: {
  project?: string | null;
  kind:     "prompt" | "response";
  content:  string;
  metadata?: Record<string, unknown>;
}): Promise<{ event_id: string }> {
  const { backend, secret } = await getSettings();
  assertBackend(backend);
  const r = await fetch(`${backend}/api/v1/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth(secret) },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Post failed");
  return j as { event_id: string };
}

export async function getAnalysis(eventId: string): Promise<AnalysisResponse> {
  const { backend, secret } = await getSettings();
  assertBackend(backend);
  const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
    headers: auth(secret),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || "Analysis fetch failed");
  return j as AnalysisResponse;
}