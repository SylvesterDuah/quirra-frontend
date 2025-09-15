export default function PoweredByCustos() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[color:var(--card)] p-3">
      <div className="text-sm">
        <span className="opacity-80">Powered by</span>{" "}
        <a href="https://custoslabs.com" target="_blank" rel="noopener noreferrer" className="underline">
          Custos
        </a>{" "}
        <span className="opacity-80">— developer toolkits for monitoring AI systems for misalignment, bias, misuse, syncopation, and more.</span>
      </div>
    </div>
  );
}
