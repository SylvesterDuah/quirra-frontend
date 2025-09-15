// Public envs so they're safe to use in the client bundle
export const CHROME_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_WEBSTORE_URL || ""; // e.g. https://chromewebstore.google.com/detail/<id>
export const EDGE_ADDONS_URL =
  process.env.NEXT_PUBLIC_EDGE_ADDONS_URL || "";     // e.g. https://microsoftedge.microsoft.com/addons/detail/<id>
