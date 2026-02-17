"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const sources = ["Reddit", "HN", "Product Hunt", "Twitter", "Trends", "App Store", "G2"];

const orbitPoints = sources.map((source, index) => {
  const angle = (index / sources.length) * Math.PI * 2;
  return {
    source,
    x: Math.cos(angle) * 120,
    y: Math.sin(angle) * 98
  };
});

export function SolutionSection() {
  return (
    <section id="solution" className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">7 Real-World Signals in 90 Seconds</h2>
        <p className="mt-3 text-slate-600">
          We aggregate live market conversations, demand trends, and competitor proof points into one confidence score.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <Badge key={source} variant="secondary" className="bg-indigo-50 text-indigo-700">
            {source}
          </Badge>
        ))}
      </div>

      <Card className="relative overflow-hidden border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-5 md:p-8">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 3.8, repeat: Infinity }}
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.2), transparent 38%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.2), transparent 32%)"
          }}
        />

        <div className="relative h-[22rem]">
          <motion.div
            className="absolute left-1/2 top-1/2 z-20 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-200 bg-white/95 p-4 text-center shadow-lg"
            animate={{ scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(99,102,241,0.16)", "0 0 0 20px rgba(99,102,241,0)", "0 0 0 0 rgba(99,102,241,0)"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Signal Fusion</p>
            <p className="mt-2 text-2xl font-bold text-[#6366f1]">78</p>
            <p className="text-xs text-slate-500">Fit Score</p>
          </motion.div>

          {orbitPoints.map((point, index) => (
            <motion.div
              key={point.source}
              className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              animate={{
                x: [point.x * 0.88, point.x, point.x * 0.92],
                y: [point.y * 0.88, point.y, point.y * 0.92],
                opacity: [0.75, 1, 0.75]
              }}
              transition={{ duration: 2.2 + index * 0.15, repeat: Infinity }}
            >
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">{point.source}</div>
            </motion.div>
          ))}
        </div>
      </Card>
    </section>
  );
}
