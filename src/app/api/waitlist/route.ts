import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = waitlistSchema.parse(body);

    return NextResponse.json(
      {
        success: true,
        message: "Waitlist request accepted.",
        data: {
          email: payload.email
        }
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid payload. Expecting { email, useCase? }."
      },
      { status: 400 }
    );
  }
}
