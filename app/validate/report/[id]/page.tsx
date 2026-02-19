import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Lightbulb, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/database.types";

type ValidationReportPageProps = {
  params: {
    id: string;
  };
};

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  hn: "Hacker News",
  ph: "Product Hunt",
  twitter: "X/Twitter",
  trends: "Google Trends",
  appstore: "App Store",
  g2: "G2"
};

function getVerdictStyles(verdict: string | null) {
  if (verdict === "BUILD") {
    return {
      badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      headline: "Build signal is strong",
      body: "Demand and founder readiness are aligned enough to move into focused execution."
    };
  }

  if (verdict === "PIVOT") {
    return {
      badge: "bg-amber-100 text-amber-700 hover:bg-amber-100",
      headline: "Pivot before scaling",
      body: "There is some demand signal, but positioning or target segment needs refinement first."
    };
  }

  return {
    badge: "bg-red-100 text-red-700 hover:bg-red-100",
    headline: "Pass for now",
    body: "Current evidence is too weak. Re-scope the idea and test a narrower pain point before building."
  };
}

function asPainQuoteList(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ quote: string; reason?: string; url?: string }>;

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const quote = typeof record.quote === "string" ? record.quote : "";
      if (!quote) return null;
      return {
        quote,
        reason: typeof record.reason === "string" ? record.reason : undefined,
        url: typeof record.url === "string" ? record.url : undefined
      };
    })
    .filter(Boolean) as Array<{ quote: string; reason?: string; url?: string }>;
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function buildNextSteps(validation: TableRow<"validations">, signalRows: TableRow<"signals">[]) {
  const weakestSources = [...signalRows]
    .sort((a, b) => (a.demand_score ?? 0) - (b.demand_score ?? 0))
    .slice(0, 2)
    .map((row) => SOURCE_LABELS[row.source] ?? row.source);

  if (validation.verdict === "BUILD") {
    return [
      "Run 10 ICP interviews this week to validate pricing sensitivity and urgency.",
      "Launch a focused landing-page test and track signup conversion.",
      weakestSources.length > 0
        ? `Strengthen weak channels first: ${weakestSources.join(", ")}.`
        : "Set weekly growth experiments for your first 30 days."
    ];
  }

  if (validation.verdict === "PIVOT") {
    return [
      "Refine your ICP and rewrite the core value proposition around one painful workflow.",
      weakestSources.length > 0
        ? `Rerun messaging tests on low-signal channels: ${weakestSources.join(", ")}.`
        : "Test 2-3 alternative positioning angles with fast smoke tests.",
      "Do a willingness-to-pay test before adding more product scope."
    ];
  }

  return [
    "Pause full product build and conduct problem discovery interviews.",
    "Choose one niche pain point with urgent demand and rerun this validation flow.",
    "Compare alternatives and identify a sharper wedge before resuming execution."
  ];
}

export default async function ValidationReportPage({ params }: ValidationReportPageProps) {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/validate");
  }

  const validationQuery = await supabase
    .from("validations")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const validation = (validationQuery.data as TableRow<"validations"> | null) ?? null;

  if (!validation) {
    notFound();
  }

  const signalsQuery = await supabase
    .from("signals")
    .select("*")
    .eq("validation_id", params.id)
    .order("demand_score", { ascending: false });
  const signals = (signalsQuery.data as TableRow<"signals">[] | null) ?? [];

  const signalRows = signals;

  const verdictUI = getVerdictStyles(validation.verdict);
  const collectedSourceCount = signalRows.length;
  const topQuotes = signalRows.flatMap((row) => asPainQuoteList(row.pain_quotes)).slice(0, 5);
  const competitors = Array.from(
    new Set(signalRows.flatMap((row) => asStringList(row.competitors)).map((item) => item.trim()))
  ).slice(0, 12);
  const nextSteps = buildNextSteps(validation, signalRows);

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/50 py-8 md:py-12">
      <div className="container max-w-6xl space-y-6">
        <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm md:p-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Step 3 of 3</span>
            <span>Verdict Report</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
          </div>
        </div>

        <Card className="border-slate-200 bg-white/90 shadow-xl shadow-indigo-100/60">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild variant="ghost" className="gap-2 px-0 text-slate-600 hover:bg-transparent hover:text-slate-950">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Badge className={verdictUI.badge}>{validation.verdict ?? "PENDING"}</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl">{verdictUI.headline}</CardTitle>
            <p className="text-sm text-slate-600">{verdictUI.body}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Signal Score</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{validation.signal_score ?? 0}/100</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Founder Fit</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{validation.founder_fit_score ?? 0}/100</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sources Collected</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{collectedSourceCount}/7</p>
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
              {signalRows.length === 0 ? (
                <p className="text-sm text-slate-600">No source rows were stored for this run.</p>
              ) : (
                signalRows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{SOURCE_LABELS[row.source] ?? row.source}</p>
                      <span className="text-sm font-semibold text-slate-700">{row.demand_score ?? 0}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                        style={{ width: `${Math.max(6, Math.min(100, row.demand_score ?? 0))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
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
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Pain quotes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topQuotes.length === 0 ? (
                <p className="text-sm text-slate-600">No strong pain quotes captured in this run.</p>
              ) : (
                topQuotes.map((quote, index) => (
                  <blockquote key={`${quote.quote}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-800">“{quote.quote}”</p>
                    {quote.reason ? <p className="mt-1 text-xs text-slate-500">{quote.reason}</p> : null}
                  </blockquote>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Competitor mentions</CardTitle>
            </CardHeader>
            <CardContent>
              {competitors.length === 0 ? (
                <p className="text-sm text-slate-600">No clear competitors extracted yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {competitors.map((competitor) => (
                    <Badge key={competitor} variant="secondary" className="bg-slate-100 text-slate-700">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
                <p className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5" />
                  Report created from persisted signal rows in Supabase. Re-run validation anytime to refresh data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {validation.status === "failed" ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">
              <p className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                This validation run was marked as failed. Re-run from founder fit step.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-indigo-200 bg-white">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-slate-900">Want a new analysis run?</p>
              <p className="text-sm text-slate-600">Tweak idea positioning and run another validation iteration.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/validate">
                  <Lightbulb className="mr-2 h-4 w-4" /> New idea
                </Link>
              </Button>
              <Button asChild className="bg-[#6366f1] hover:bg-[#4f46e5]">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
