import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "validate-my-idea-api",
    now: new Date().toISOString()
  });
}
