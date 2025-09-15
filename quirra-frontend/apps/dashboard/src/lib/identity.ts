/// <reference types="chrome" />
// quirra-frontend/apps/dashboard/src/lib/identity.ts
export async function getStableBrowserId(): Promise<string> {
  return new Promise((res) => {
    chrome.storage.sync.get({ quirra_id: "" }, (obj) => {
      if (obj.quirra_id) return res(obj.quirra_id as string);
      const rnd = crypto.getRandomValues(new Uint32Array(4));
      const id = Array.from(rnd).map((n) => n.toString(36)).join("-");
      chrome.storage.sync.set({ quirra_id: id }, () => res(id));
    });
  });
}
