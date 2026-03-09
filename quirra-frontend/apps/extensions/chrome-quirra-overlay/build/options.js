const backendEl = document.querySelector("#backend");
const secretEl  = document.querySelector("#secret");
const saveBtn   = document.querySelector("#save");

chrome.storage.sync.get({ backend: "", secret: "" }, (v) => {
  if (backendEl) backendEl.value = v.backend || "";
  if (secretEl)  secretEl.value  = v.secret || "";
});

saveBtn?.addEventListener("click", () => {
  const backend = (backendEl?.value || "").trim();
  const secret  = (secretEl?.value  || "").trim();
  chrome.storage.sync.set({ backend, secret }, () => {
    saveBtn.textContent = "Saved ✓";
    setTimeout(() => (saveBtn.textContent = "Save"), 1000);
  });
});
