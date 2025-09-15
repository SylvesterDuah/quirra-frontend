// quirra-frontend/apps/dashboard-next/src/components/Aura.tsx

"use client";

import { motion } from "framer-motion";

export default function Aura() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0.25, scale: 0.95, x: 0, y: 0 }}
        animate={{ opacity: 0.45, scale: 1.05, x: 8, y: -6 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
        className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vw] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0.12) 40%, rgba(99,102,241,0) 70%)",
          filter: "blur(24px)"
        }}
      />
      <motion.div
        initial={{ opacity: 0.2, scale: 0.95, x: 0, y: 0 }}
        animate={{ opacity: 0.35, scale: 1.08, x: -10, y: 10 }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
        className="absolute right-[10%] bottom-[-20%] h-[50vh] w-[40vw] rounded-full"
        style={{
          background:
            "radial-gradient(55% 55% at 50% 50%, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0.10) 40%, rgba(16,185,129,0) 70%)",
          filter: "blur(26px)"
        }}
      />
      <motion.div
        initial={{ opacity: 0.06, y: 80 }}
        animate={{ opacity: 0.12, y: -80 }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "mirror" }}
        className="absolute inset-x-0 top-1/4 h-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(148,163,184,0.18) 50%, rgba(255,255,255,0) 100%)",
          filter: "blur(8px)"
        }}
      />
    </div>
  );
}
