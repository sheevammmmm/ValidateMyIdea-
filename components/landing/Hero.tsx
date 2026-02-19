"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const signals = [
  { label: "Demand", value: 86, tone: "bg-emerald-500" },
  { label: "Competition", value: 62, tone: "bg-indigo-500" },
  { label: "Willingness to Pay", value: 71, tone: "bg-cyan-500" },
  { label: "Urgency", value: 78, tone: "bg-violet-500" }
];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateLayout = () => setIsDesktop(mediaQuery.matches);

    updateLayout();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateLayout);
      return () => mediaQuery.removeEventListener("change", updateLayout);
    }

    mediaQuery.addListener(updateLayout);
    return () => mediaQuery.removeListener(updateLayout);
  }, []);

  const shouldLoop = isDesktop && !prefersReducedMotion;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <Badge className="mb-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">ValidateMyIdea.app</Badge>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-600">
          From Brainstorm to Data-Backed Verdict in 90 Seconds
        </p>

        <h1 className="text-balance text-4xl font-extrabold leading-tight text-slate-950 md:text-5xl">
          90% of Startups Fail Building Products Nobody Wants
        </h1>

        <p className="mt-4 max-w-xl text-base text-slate-600 md:text-lg">
          Validate Your Idea in 90 Seconds Using Real Signals from Reddit, HN, Product Hunt &amp; More
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="bg-[#6366f1] text-white hover:bg-[#4f46e5]">
            <Link href="/validate" className="gap-2">
              Validate My Idea (Free) <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
            <Link href="/sample-report">See Sample Report</Link>
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            Real Reddit/HN/PH data
          </Badge>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            No credit card
          </Badge>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            Report in &lt;2 min
          </Badge>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-indigo-100 bg-white/95 shadow-xl shadow-indigo-200/40">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-emerald-50">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Live Validation Report</CardTitle>
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Idea Looks Viable
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Founder-Market Fit Score</p>
              <motion.p
                className="mt-1 text-3xl font-extrabold text-slate-900"
                initial={{ opacity: 0.3 }}
                animate={shouldLoop ? { opacity: [0.75, 1, 0.85, 1] } : { opacity: 1 }}
                transition={shouldLoop ? { duration: 4.2, repeat: Infinity } : { duration: 0.2 }}
              >
                78 / 100
              </motion.p>
            </div>

            <div className="space-y-3">
              {signals.map((signal, index) => (
                <div key={signal.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{signal.label}</span>
                    <span>{signal.value}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <motion.div
                      className={`h-2.5 rounded-full ${signal.tone}`}
                      initial={{ width: 0 }}
                      animate={
                        shouldLoop
                          ? {
                              width: [
                                `${Math.max(signal.value - 8, 20)}%`,
                                `${signal.value}%`,
                                `${Math.max(signal.value - 4, 20)}%`
                              ]
                            }
                          : { width: `${signal.value}%` }
                      }
                      transition={
                        shouldLoop
                          ? { duration: 4 + index * 0.25, repeat: Infinity, repeatType: "reverse" }
                          : { duration: 0.45, ease: "easeOut" }
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
