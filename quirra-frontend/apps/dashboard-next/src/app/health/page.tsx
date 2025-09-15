export const dynamic = "force-dynamic"; // don't cache

export default async function HealthPage() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/quirra/health`, { cache: "no-store" })
    .catch(() => null);

  if (!r || !r.ok) {
    return (
      <main style={{ padding: 24 }}>
        <h2>Backend Health</h2>
        <pre>offline</pre>
      </main>
    );
  }
  const data = await r.json();
  return (
    <main style={{ padding: 24 }}>
      <h2>Backend Health</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
