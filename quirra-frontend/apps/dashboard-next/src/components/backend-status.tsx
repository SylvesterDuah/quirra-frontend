"use client";
import { useEffect, useState } from "react";

export default function BackendStatus() {
  const [ok, setOk] = useState<boolean | null>(null);

  async function ping() {
    try {
      const res = await fetch("/api/quirra/health", { cache: "no-store" });
      setOk(res.ok);
    } catch {
      setOk(false);
    }
  }

  useEffect(() => {
    ping();
    const t = setInterval(ping, 10000);
    return () => clearInterval(t);
  }, []);

  const color = ok === null ? "#888" : ok ? "#24d166" : "#ff6b6b";
  const label = ok === null ? "checking…" : ok ? "online" : "offline";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 10, height: 10, borderRadius: 9999, background: color, display: "inline-block"
      }} />
      <span style={{ fontSize: 12, opacity: .8 }}>Backend: {label}</span>
    </div>
  );
}
