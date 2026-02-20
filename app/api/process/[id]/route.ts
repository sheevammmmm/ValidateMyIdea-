import { NextResponse } from "next/server";
import { analyzeIdea, type AnalysisResult } from "@/lib/analysis/analyze";
import { fetchHNSignals, type Signal } from "@/lib/signals/hn";
import { fetchAllSignals } from "@/lib/api/aggregator";
import type { SignalFusionOutput, Sentiment } from "@/lib/api/types/signals";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type ValidationRow = {
  id: string;
  idea_text: string;
  industry: string | null;
};

type RouteContext = {
  params: {
    id: string;
  };
};

type ProcessResultJson = {
  signals: AggregatedSignal[];
  analysis: AnalysisResult;
  fusion: SignalFusionOutput;
  processed_at: string;
};

type AggregatedSignal = {
  text: string;
  source: "reddit" | "hn" | "ph";
  engagement: number;
  url: string;
};

async function markFailed(validationId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("validations").update({ status: "failed" }).eq("id", validationId);
  } catch {
    // Best-effort failure state update.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toSignalSource(rawSource: string): AggregatedSignal["source"] {
  const normalized = rawSource.toLowerCase();

  if (normalized.startsWith("reddit")) {
    return "reddit";
  }

  if (normalized.includes("producthunt")) {
    return "ph";
  }

  return "hn";
}

function normalizeSignals(fusion: SignalFusionOutput): AggregatedSignal[] {
  return fusion.painQuotes.slice(0, 30).map((quote) => ({
    text: quote.text,
    source: toSignalSource(quote.source),
    engagement: Math.max(0, Math.round(quote.engagement)),
    url: quote.url
  }));
}

function normalizeHnSignals(signals: Signal[]): AggregatedSignal[] {
  return signals.map((signal) => ({
    text: signal.text,
    source: "hn",
    engagement: Math.max(0, Math.round(signal.engagement)),
    url: signal.url
  }));
}

function buildFallbackFusion(hnSignals: Signal[]): SignalFusionOutput {
  const totalMentions = hnSignals.length;
  const totalEngagement = hnSignals.reduce((sum, signal) => sum + signal.engagement, 0);
  const score = clamp(Math.round(totalMentions * 4 + Math.log10(totalEngagement + 1) * 12), 0, 100);

  return {
    signalScore: score,
    painQuotes: hnSignals.slice(0, 20).map((signal) => ({
      text: signal.text,
      source: "hackernews",
      engagement: signal.engagement,
      url: signal.url
    })),
    competitors: [],
    demandMetrics: {
      totalMentions,
      sentiment: "neutral",
      trending: totalMentions >= 12
    },
    risks: ["Signal fusion fallback in use (Hacker News only)."]
  };
}

function toSentimentReason(sentiment: Sentiment): string {
  if (sentiment === "positive") {
    return "overall discussion sentiment is positive";
  }

  if (sentiment === "negative") {
    return "overall discussion sentiment is negative";
  }

  return "overall discussion sentiment is mixed";
}

function buildHeuristicAnalysis(idea: string, signals: AggregatedSignal[], fusion: SignalFusionOutput): AnalysisResult {
  const mentionCount = fusion.demandMetrics.totalMentions;
  const score = fusion.signalScore;
  const sentiment = fusion.demandMetrics.sentiment;
  const trending = fusion.demandMetrics.trending;

  let verdict: AnalysisResult["verdict"] = "PIVOT";

  if (score >= 70 && mentionCount >= 15 && sentiment !== "negative") {
    verdict = "BUILD";
  } else if (score < 35 || (mentionCount < 8 && sentiment === "negative")) {
    verdict = "PASS";
  }

  const confidence: AnalysisResult["confidence"] =
    score >= 75 && mentionCount >= 25 ? "High" : score >= 45 && mentionCount >= 10 ? "Medium" : "Low";

  const opportunities =
    fusion.painQuotes.slice(0, 3).map((quote) => `Directly address: "${quote.text.slice(0, 140)}${quote.text.length > 140 ? "..." : ""}"`) ||
    [];

  if (opportunities.length === 0) {
    opportunities.push("Run 10 customer interviews to gather first-party pain evidence before building.");
  }

  const risks = [...fusion.risks];
  if (signals.length === 0) {
    risks.push("No usable discussion quotes were extracted from current sources.");
  }

  const reasoning = `${idea.trim().slice(0, 120)}${idea.trim().length > 120 ? "..." : ""}: signal score ${score}/100 from ${mentionCount} mentions, ${toSentimentReason(
    sentiment
  )}, and trend status is ${trending ? "rising" : "not clearly rising"}.`;

  return {
    verdict,
    reasoning,
    opportunities: opportunities.slice(0, 4),
    risks: risks.slice(0, 5),
    confidence
  };
}

async function runAnalysis(idea: string, signals: AggregatedSignal[], fusion: SignalFusionOutput): Promise<AnalysisResult> {
  if (process.env.AI_API_KEY) {
    try {
      return await analyzeIdea(idea, signals);
    } catch {
      return buildHeuristicAnalysis(idea, signals, fusion);
    }
  }

  return buildHeuristicAnalysis(idea, signals, fusion);
}

export async function POST(_request: Request, context: RouteContext) {
  const validationId = context.params.id?.trim();

  if (!validationId) {
    return NextResponse.json({ success: false, error: "Validation ID is required" }, { status: 400 });
  }

  const supabase = createClient();

  try {
    const { data: validation, error: fetchError } = await supabase
      .from("validations")
      .select("id, idea_text, industry")
      .eq("id", validationId)
      .maybeSingle<ValidationRow>();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!validation) {
      return NextResponse.json({ success: false, error: "Validation not found" }, { status: 404 });
    }

    const { error: processingError } = await supabase
      .from("validations")
      .update({ status: "processing" })
      .eq("id", validationId);

    if (processingError) {
      throw new Error(processingError.message);
    }

    let fusion: SignalFusionOutput;
    let signals: AggregatedSignal[] = [];

    try {
      fusion = await fetchAllSignals(validation.idea_text, validation.industry ?? "General");
      signals = normalizeSignals(fusion);
    } catch {
      const hnSignals = await fetchHNSignals(validation.idea_text);
      fusion = buildFallbackFusion(hnSignals);
      signals = normalizeHnSignals(hnSignals);
    }

    const analysis = await runAnalysis(validation.idea_text, signals, fusion);

    const resultJson: ProcessResultJson = {
      signals,
      analysis,
      fusion,
      processed_at: new Date().toISOString()
    };

    const { error: doneError } = await supabase
      .from("validations")
      .update({
        status: "done",
        result_json: resultJson as unknown as Json
      })
      .eq("id", validationId);

    if (doneError) {
      throw new Error(doneError.message);
    }

    return NextResponse.json({
      success: true,
      validationId,
      status: "done"
    });
  } catch {
    await markFailed(validationId);

    return NextResponse.json(
      {
        success: false,
        validationId,
        status: "failed"
      },
      { status: 500 }
    );
  }
}
