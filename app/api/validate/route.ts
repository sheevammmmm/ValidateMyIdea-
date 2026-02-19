import { NextResponse } from "next/server";
import { z } from "zod";
import { runValidationEngine } from "@/lib/validation/engine";

export const runtime = "nodejs";

const validateIdeaSchema = z.object({
  idea: z.string().trim().min(1, "Idea is required"),
  industry: z.string().max(120).optional(),
  targetAudience: z.string().max(200).optional(),
  stage: z.enum(["pre-idea", "mvp", "launched"]).default("pre-idea")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = validateIdeaSchema.parse(body);

    const engineResult = await runValidationEngine({
      ideaText: payload.idea,
      industry: payload.industry,
      targetCustomer: payload.targetAudience,
      stage: payload.stage
    });

    return NextResponse.json(
      {
        success: true,
        analysis: {
          verdict: engineResult.verdict,
          confidence: engineResult.confidence / 100,
          signalScore: engineResult.signalScore,
          founderFitScore: engineResult.founderFitScore,
          summary: engineResult.summary,
          nextSteps: engineResult.nextSteps,
          coverage: engineResult.coverage
        },
        sources: engineResult.signals.map((source) => ({
          source: source.source,
          status: source.status,
          demandScore: source.demandScore,
          mentions: source.mentions,
          highlights: source.highlights,
          error: source.error
        })),
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

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error while validating idea"
      },
      { status: 500 }
    );
  }
}
