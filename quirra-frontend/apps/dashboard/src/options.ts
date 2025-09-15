/// <reference types="chrome" />
// quirra-frontend/apps/dashboard/src/options.ts
const backendEl = document.querySelector<HTMLInputElement>("#backend");
const secretEl  = document.querySelector<HTMLInputElement>("#secret");
const saveBtn   = document.querySelector<HTMLButtonElement>("#save");

chrome.storage.sync.get({ backend: "", secret: "" }, (v) => {
  if (backendEl) backendEl.value = v.backend || "";
  if (secretEl)  secretEl.value  = v.secret || "";
});

saveBtn?.addEventListener("click", () => {
  const backend = backendEl?.value.trim() || "";
  const secret  = secretEl?.value.trim()  || "";
  chrome.storage.sync.set({ backend, secret }, () => {
    if (saveBtn) {
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => (saveBtn.textContent = "Save"), 1000);
    }
  });
});
