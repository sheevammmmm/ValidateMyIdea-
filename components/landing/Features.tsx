"use client";

import { motion } from "framer-motion";
import {
  Compass,
  GitBranchPlus,
  MessageSquareText,
  Rocket,
  Sparkles,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Signal Fusion Engine",
    description: "Combines 7 external channels into one weighted demand-confidence model.",
    icon: Sparkles
  },
  {
    title: "Founder-Market Fit Score",
    description: "Instantly see idea viability based on urgency, demand, and buyer intent.",
    icon: Target
  },
  {
    title: "AI Pivot Suggestions",
    description: "Get sharp pivot angles when your current positioning looks weak.",
    icon: GitBranchPlus
  },
  {
    title: "Interview Script Generator",
    description: "Create founder-ready customer interview scripts in one click.",
    icon: MessageSquareText
  },
  {
    title: "Competition Analysis",
    description: "Benchmark alternatives by feature focus, pricing, and market narrative.",
    icon: Compass
  },
  {
    title: "$10K MRR Roadmap",
    description: "Receive a practical launch roadmap to move from idea to first revenue.",
    icon: Rocket
  }
];

export function Features() {
  return (
    <section id="features" className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Built for founders who move fast</h2>
        <p className="mt-3 text-slate-600">Everything you need to validate, refine, and launch with data-backed confidence.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <Card className="h-full border-slate-200 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <feature.icon className="h-5 w-5 text-[#6366f1]" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
