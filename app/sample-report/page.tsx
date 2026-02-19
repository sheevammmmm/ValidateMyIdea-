import Link from "next/link";
import { ArrowLeft, CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sourceSignals = [
  { source: "Reddit", score: 82 },
  { source: "Hacker News", score: 75 },
  { source: "Product Hunt", score: 69 },
  { source: "X/Twitter", score: 72 },
  { source: "Google Trends", score: 80 },
  { source: "App Store", score: 64 },
  { source: "G2", score: 58 }
];

const nextSteps = [
  "Run 10 founder interviews focused on pricing and urgency this week.",
  "Ship a no-code waitlist page and validate signup conversion with paid traffic.",
  "Position around one urgent workflow before broadening product scope."
];

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/50 py-8 md:py-12">
      <div className="container max-w-5xl space-y-6">
        <Button asChild variant="ghost" className="gap-2 px-0 text-slate-600 hover:bg-transparent hover:text-slate-950">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to landing page
          </Link>
        </Button>

        <Card className="border-slate-200 bg-white/90 shadow-lg">
          <CardHeader className="space-y-3">
            <Badge className="w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Sample Report</Badge>
            <CardTitle className="text-2xl md:text-3xl">Verdict: BUILD</CardTitle>
            <p className="text-sm text-slate-600">
              This sample shows the exact style of verdict report users receive after market signal analysis.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Signal Score</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">76/100</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Founder Fit</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">79/100</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sources Collected</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">7/7</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Source signal breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sourceSignals.map((item) => (
                <div key={item.source} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{item.source}</p>
                    <span className="text-sm font-semibold text-slate-700">{item.score}/100</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recommended next steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700">
                {nextSteps.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
                <p className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5" />
                  Your live report includes fresh signal collection and tailored recommendations for your exact idea.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-center">
          <h2 className="text-xl font-bold text-slate-950 md:text-2xl">Ready for your own verdict?</h2>
          <p className="mt-2 text-sm text-slate-600">Run your idea through the same validation flow and get a tailored report.</p>
          <Button asChild className="mt-4 bg-[#6366f1] hover:bg-[#4f46e5]">
            <Link href="/validate">Validate My Idea (Free)</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
