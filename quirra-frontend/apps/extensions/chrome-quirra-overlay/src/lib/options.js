const baseUrlEl = document.getElementById("baseUrl");
const secretEl = document.getElementById("secret");

chrome.storage.sync.get(["baseUrl", "secret"], (cfg) => {
  baseUrlEl.value = cfg.baseUrl || "http://127.0.0.1:8000";
  secretEl.value = cfg.secret || "";
});

document.getElementById("save").onclick = () => {
  chrome.storage.sync.set(
    { baseUrl: baseUrlEl.value, secret: secretEl.value },
    () => alert("Saved. Reload your AI tab.")
  );
};
