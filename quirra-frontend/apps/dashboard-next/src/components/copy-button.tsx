// quirra-frontend/apps/dashboard-next/src/components/copy-button.tsx

"use client";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="rounded-lg border border-[var(--card-border)] bg-[color:var(--card)] px-3 py-1 text-xs hover:bg-white/10"
      aria-label="Copy to clipboard"
    >
      {ok ? "Copied!" : "Copy"}
    </button>
  );
}
