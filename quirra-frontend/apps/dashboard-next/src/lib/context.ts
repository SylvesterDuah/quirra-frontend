// quirra-frontend/apps/dashboard-next/src/lib/context.ts
export function inferContext(text: string): string {
  const t = (text || "").toLowerCase();
  if (t.includes("essay") || t.includes("assignment")) return "course essay";
  if (t.includes("blog") || t.includes("seo")) return "blog brief";
  if (t.includes("memo") || t.includes("update")) return "team memo";
  if (t.includes("outline")) return "outline";
  return "general";
}

export function isPublicUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return ["http:", "https:"].includes(u.protocol) && u.hostname !== "localhost";
  } catch {
    return false;
  }
}
