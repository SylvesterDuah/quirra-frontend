// quirra-frontend/apps/extensions/chrome-quirrs-overlays/src/lib/context.ts
export function inferContext(text) {
    const t = (text || "").toLowerCase();
    if (t.includes("essay") || t.includes("assignment"))
        return "course essay";
    if (t.includes("blog") || t.includes("seo"))
        return "blog brief";
    if (t.includes("memo") || t.includes("update"))
        return "team memo";
    if (t.includes("outline"))
        return "outline";
    return "general";
}
export function isPublicUrl(href) {
    try {
        const u = new URL(href);
        return ["http:", "https:"].includes(u.protocol) && u.hostname !== "localhost";
    }
    catch {
        return false;
    }
}
