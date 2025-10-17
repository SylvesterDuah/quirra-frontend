async function getSettings() {
    const v = await chrome.storage.sync.get({ backend: "", secret: "" });
    return { backend: v.backend || "", secret: v.secret || "" };
}
export async function hashUserServerSide(userId) {
    const { backend, secret } = await getSettings();
    const r = await fetch(`${backend}/api/v1/hash`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
        body: JSON.stringify({ user_id: userId }),
    });
    const j = await r.json();
    if (!r.ok)
        throw new Error(j?.detail || "Hash failed");
    return j.user_hash;
}
export async function postEvent(payload) {
    const { backend, secret } = await getSettings();
    const r = await fetch(`${backend}/api/v1/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(secret ? { "X-Quirra-Secret": secret } : {}) },
        body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok)
        throw new Error(j?.detail || "Post failed");
    return j;
}
export async function getAnalysis(eventId) {
    const { backend, secret } = await getSettings();
    const r = await fetch(`${backend}/api/v1/events/${eventId}/analysis`, {
        headers: { ...(secret ? { "X-Quirra-Secret": secret } : {}) },
    });
    const j = await r.json();
    if (!r.ok)
        throw new Error(j?.detail || "Analysis fetch failed");
    return j;
}
