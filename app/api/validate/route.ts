import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAllSignals } from "@/lib/api/aggregator";
import { SourceApiError, type SignalFusionOutput } from "@/lib/api/types/signals";

export const runtime = "nodejs";

const validateIdeaSchema = z.object({
  idea: z.string().min(12, "Idea must be at least 12 characters").max(500),
  industry: z.string().max(100).optional(),
  targetAudience: z.string().max(200).optional()
});

type Verdict = "BUILD" | "PIVOT" | "PASS";

function toConfidence(score: number): number {
  return Number(Math.max(0.05, Math.min(0.95, score / 100)).toFixed(2));
}

function toVerdict(score: number): Verdict {
  if (score >= 70) {
    return "BUILD";
  }

  if (score >= 40) {
    return "PIVOT";
  }

  return "PASS";
}

function buildSummary(signals: SignalFusionOutput): string {
  const trendFragment = signals.demandMetrics.trending ? "Momentum appears to be increasing." : "Momentum appears moderate.";
  const sentimentFragment = `Sentiment is ${signals.demandMetrics.sentiment}.`;

  if (signals.painQuotes.length > 0) {
    return `${trendFragment} ${sentimentFragment} We found ${signals.painQuotes.length} concrete pain signal quote(s) across sources.`;
  }

  return `${trendFragment} ${sentimentFragment} Direct pain quotes are limited, so customer interviews should be prioritized.`;
}

function buildNextSteps(signals: SignalFusionOutput): string[] {
  const steps: string[] = [];

  if (signals.painQuotes.length < 5) {
    steps.push("Run 10-15 customer interviews to validate problem urgency and language.");
  } else {
    steps.push("Use the strongest pain quotes to craft a focused landing page and waitlist test.");
  }

  if (signals.competitors.length > 0) {
    steps.push("Map top competitors by positioning, pricing, and feature gaps before building.");
  }

  if (signals.demandMetrics.sentiment === "negative") {
    steps.push("Address the main negative sentiment themes in onboarding and product UX scope.");
  } else {
    steps.push("Prototype a narrow MVP and test willingness-to-pay with early adopters.");
  }

  steps.push("Re-run signal scan after interviews to measure movement in sentiment and mentions.");

  return steps.slice(0, 4);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = validateIdeaSchema.parse(body);
    const industry = payload.industry?.trim() || payload.targetAudience?.trim() || "General";
    const compositeIdea = payload.targetAudience
      ? `${payload.idea.trim()} Target audience: ${payload.targetAudience.trim()}.`
      : payload.idea.trim();

    const signals = await fetchAllSignals(compositeIdea, industry);
    const verdict = toVerdict(signals.signalScore);

    return NextResponse.json(
      {
        success: true,
        analysis: {
          verdict,
          confidence: toConfidence(signals.signalScore),
          signalScore: signals.signalScore,
          summary: buildSummary(signals),
          nextSteps: buildNextSteps(signals),
          integrationsConfigured: {
            anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
            supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
            serpApi: Boolean(process.env.SERPAPI_KEY ?? process.env.SERPAPI_API_KEY),
            productHunt: Boolean(process.env.PRODUCTHUNT_API_KEY ?? process.env.PRODUCT_HUNT_ACCESS_TOKEN),
            redis: Boolean(process.env.REDIS_URL)
          }
        },
        signals,
        input: payload
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          issues: error.flatten()
        },
        { status: 400 }
      );
    }

    if (error instanceof SourceApiError) {
      const status =
        error.code === "VALIDATION_ERROR"
          ? 400
          : error.code === "RATE_LIMITED"
            ? 429
            : error.code === "AUTH_ERROR"
              ? 401
              : error.code === "CONFIG_ERROR"
                ? 503
                : 502;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          source: error.source,
          code: error.code,
          details: error.details ?? null
        },
        { status }
      );
    }

    console.error("Unexpected validate API error", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error while validating idea"
      },
      { status: 500 }
    );
  }
}
