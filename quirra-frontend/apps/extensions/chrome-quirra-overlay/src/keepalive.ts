// extensions/chrome-quirra-overlay/src/keepalive.ts


const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

async function ping() {
  try {
    const v = await chrome.storage.sync.get({ backend: "" });
    const backend = (v.backend || "").replace(/\/+$/, "");
    if (!backend) return;

    const res = await fetch(`${backend}/api/health`, {
      method: "GET",
      cache:  "no-store",
    });
    console.debug(`[Quirra keepalive] ${res.status} ${new Date().toISOString()}`);
  } catch (e) {
    console.debug("[Quirra keepalive] ping failed:", e);
  }
}

// Ping immediately on install/startup, then every 14 minutes
ping();
setInterval(ping, PING_INTERVAL_MS);

// Also ping when Chrome wakes the service worker for any reason
chrome.runtime.onStartup.addListener(ping);
chrome.runtime.onInstalled.addListener(ping);