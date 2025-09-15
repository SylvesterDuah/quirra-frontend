// quirra-frontend/apps/dashboard-next/src/app/loading.tsx

import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center py-16">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo1.png"
          alt="Quirra logo"
          width={96}
          height={96}
          priority
          className="h-24 w-24 rounded-xl object-contain md:h-28 md:w-28"
        />
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--muted)] border-t-transparent" />
        <p className="text-sm text-[color:var(--muted)]">Loading…</p>
      </div>
    </div>
  );
}
