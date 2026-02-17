"use client";

import { motion } from "framer-motion";
import { Bot, SearchCheck, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  {
    title: "AI hallucination loops",
    body: "Generic AI tools sound confident but invent market insights, making founders build on false positives.",
    icon: Bot
  },
  {
    title: "Manual research chaos",
    body: "Switching between Reddit, HN, Product Hunt, and Twitter tabs burns days and still misses key demand signals.",
    icon: SearchCheck
  },
  {
    title: "Talk to 100 customers first?",
    body: "Cold outreach at that scale is slow and expensive before you even know if your idea deserves deeper validation.",
    icon: UsersRound
  }
];

export function ProblemSection() {
  return (
    <section id="problem" className="space-y-5">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Traditional validation sucks</h2>
        <p className="mt-3 text-slate-600">
          Most founders either trust gut instinct or drown in fragmented research. Both paths waste time and runway.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {painPoints.map((point, index) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
          >
            <Card className="h-full border-red-100 bg-white/90 shadow-sm">
              <CardHeader>
                <point.icon className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{point.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
