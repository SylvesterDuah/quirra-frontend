// extensions/chrome-quirra-overlay/src/lib/identity.ts
export async function getStableBrowserId() {
    const key = "quirra_browser_id";
    const existing = await chrome.storage.local.get(key);
    if (existing[key])
        return existing[key];
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [key]: id });
    return id;
}
