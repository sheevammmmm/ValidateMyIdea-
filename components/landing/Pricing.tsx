"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  {
    name: "Free",
    price: "$0",
    subtitle: "3 validations/month",
    perks: ["7-signal analysis", "Founder-market fit score", "Basic roadmap"],
    cta: "Validate My Idea (Free)",
    highlight: false
  },
  {
    name: "Pro",
    price: "$29",
    subtitle: "Unlimited validations",
    perks: ["Everything in Free", "AI pivot suggestions", "Interview scripts + deep competition analysis"],
    cta: "Start Free Trial",
    highlight: true
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Pricing for builders, not enterprise committees</h2>
        <p className="mt-3 text-slate-600">Start free and scale once you are running validations weekly.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
          >
            <Card className={tier.highlight ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-white"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.highlight ? <Badge className="bg-emerald-500 text-white">Most Popular</Badge> : null}
                </div>
                <p className="text-4xl font-extrabold text-slate-950">{tier.price}</p>
                <p className="text-sm text-slate-600">{tier.subtitle}</p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button asChild className={tier.highlight ? "w-full bg-[#6366f1] hover:bg-[#4f46e5]" : "w-full"} variant={tier.highlight ? "default" : "outline"}>
                  <Link href="/validate">{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
        <p className="text-sm text-slate-600">Ready to go from validation to traction?</p>
        <Button asChild className="mt-3 bg-[#6366f1] hover:bg-[#4f46e5]">
          <Link href="/validate">Start Free Trial</Link>
        </Button>
      </div>
    </section>
  );
}
