// quirra-frontend/apps/dashboard-next/src/components/animated-demo.tsx
"use client";

import { motion } from "framer-motion";

export default function AnimatedDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-[var(--card-border)] bg-white/5 p-4"
    >
      <div className="text-sm text-[color:var(--muted)]">
        Live overlay demo goes here.
      </div>
    </motion.div>
  );
}
