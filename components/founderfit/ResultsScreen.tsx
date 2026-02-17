"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Gauge, Rocket, ShieldAlert, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FounderFitResult } from "@/lib/scoring/founderFit";

interface ResultsScreenProps {
  result: FounderFitResult;
  onRetake: () => void;
  onContinue: () => void;
}

const GAUGE_RADIUS = 72;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
const CONFETTI_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#ef4444", "#14b8a6"];

function toneForScore(score: number): { badge: string; color: string } {
  if (score >= 75) {
    return { badge: "High Fit", color: "text-emerald-600" };
  }

  if (score >= 55) {
    return { badge: "Moderate Fit", color: "text-amber-600" };
  }

  return { badge: "Needs Work", color: "text-rose-600" };
}

export function ResultsScreen({ result, onRetake, onContinue }: ResultsScreenProps) {
  const gaugeOffset = GAUGE_CIRCUMFERENCE - (result.score / 100) * GAUGE_CIRCUMFERENCE;
  const celebratory = result.score > 70;
  const tone = toneForScore(result.score);

  const confettiParticles = useMemo(
    () =>
      Array.from({ length: 46 }, (_, index) => {
        const seeded = index + 1;
        const leftPercent = (seeded * 13.7) % 100;
        const swayX = (seeded % 2 === 0 ? 1 : -1) * (18 + (seeded % 8) * 6);

        return {
          id: seeded,
          leftPercent,
          swayX,
          delay: (seeded % 12) * 0.05,
          duration: 1.6 + (seeded % 7) * 0.2,
          size: 6 + (seeded % 4) * 2,
          color: CONFETTI_COLORS[seeded % CONFETTI_COLORS.length]
        };
      }),
    []
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white/95 shadow-xl shadow-indigo-100/50 backdrop-blur-sm">
      {celebratory ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confettiParticles.map((particle) => (
            <motion.span
              key={particle.id}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${particle.leftPercent}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color
              }}
              initial={{ opacity: 0, y: -20, x: 0, rotate: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: [0, 280, 420], x: [0, particle.swayX, particle.swayX * 1.5], rotate: [0, 140, 280] }}
              transition={{ duration: particle.duration, delay: particle.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-6 p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]"
        >
          <Card className="border-slate-200 bg-gradient-to-br from-white via-indigo-50/40 to-emerald-50/50">
            <CardHeader className="items-center text-center">
              <Badge variant={result.score >= 70 ? "success" : "outline"}>{tone.badge}</Badge>
              <CardTitle className="text-xl">Founder-Market Fit Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-8">
              <div className="relative grid h-44 w-44 place-items-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180" aria-hidden>
                  <circle cx="90" cy="90" r={GAUGE_RADIUS} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="14" />
                  <motion.circle
                    cx="90"
                    cy="90"
                    r={GAUGE_RADIUS}
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={GAUGE_CIRCUMFERENCE}
                    initial={{ strokeDashoffset: GAUGE_CIRCUMFERENCE }}
                    animate={{ strokeDashoffset: gaugeOffset }}
                    transition={{ duration: 1.15, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute text-center">
                  <p className="text-5xl font-bold tracking-tight text-slate-900">{result.score}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">out of 100</p>
                </div>
              </div>

              <p className={`text-sm font-medium ${tone.color}`}>{result.yourEdge}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="border-indigo-100 bg-indigo-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <Target className="h-4 w-4 text-indigo-600" /> Your Edge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                {result.strengths.map((strength) => (
                  <p key={strength} className="rounded-md border border-indigo-100 bg-white/70 px-3 py-2">
                    {strength}
                  </p>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="inline-flex items-center gap-2 text-lg">
                  <Gauge className="h-4 w-4 text-emerald-600" /> Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Domain Match", value: result.componentScores.domainScore },
                  { label: "Experience", value: result.componentScores.experienceScore },
                  { label: "Skill Coverage", value: result.componentScores.skillGapScore },
                  { label: "Resource Readiness", value: result.componentScores.resourceScore }
                ].map((entry) => (
                  <div key={entry.label}>
                    <div className="mb-1 flex items-center justify-between text-slate-700">
                      <span>{entry.label}</span>
                      <span className="font-semibold">{Math.round(entry.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, Math.round(entry.value))}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-rose-100 bg-rose-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <ShieldAlert className="h-4 w-4 text-rose-600" /> Skill Gaps + Mitigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {result.gaps.length > 0 ? (
                result.gaps.map((gap) => (
                  <div key={gap.gap} className="rounded-lg border border-rose-100 bg-white/80 p-3">
                    <p className="font-medium text-slate-900">{gap.gap}</p>
                    <p className="mt-1 text-slate-600">{gap.mitigation}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
                  No major gaps identified. Focus on fast customer feedback loops.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <Rocket className="h-4 w-4 text-emerald-600" /> Resource Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              {result.recommendations.map((recommendation) => (
                <div key={recommendation} className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                  {recommendation}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onRetake}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Review Answers
          </Button>

          <Button type="button" onClick={onContinue} className="bg-indigo-600 hover:bg-indigo-500">
            <Sparkles className="mr-2 h-4 w-4" /> Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
