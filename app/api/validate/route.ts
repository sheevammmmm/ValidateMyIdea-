import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const validateIdeaSchema = z.object({
  idea: z.string().min(12, "Idea must be at least 12 characters").max(500),
  targetAudience: z.string().max(200).optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = validateIdeaSchema.parse(body);

    const response = {
      success: true,
      analysis: {
        verdict: "Promising, but needs proof from customer interviews",
        confidence: 0.68,
        summary:
          "Early signal quality looks positive for a narrow niche. Validate willingness to pay with 10 interviews and one landing-page smoke test before building core product workflows.",
        nextSteps: [
          "Run 10 founder/user interviews focused on existing alternatives and urgency.",
          "Launch one focused landing page and measure conversion-to-waitlist.",
          "Compare competitor pricing and positioning across Product Hunt and search results."
        ],
        integrationsConfigured: {
          anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
          supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          serpApi: Boolean(process.env.SERPAPI_API_KEY)
        }
      },
      input: payload
    };

    return NextResponse.json(response, { status: 200 });
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
        error: "Unexpected error while validating idea"
      },
      { status: 500 }
    );
  }
}
