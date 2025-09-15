// quirra-frontend/apps/dashboard-next/src/lib/identity.ts
export async function getStableBrowserId(): Promise<string> {
  if (typeof window === "undefined") return "server";
  const key = "quirra_web_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}
