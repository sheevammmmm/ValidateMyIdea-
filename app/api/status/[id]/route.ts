import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type ValidationStatus = "pending" | "processing" | "done" | "failed";

interface ValidationRow {
  id: string;
  status: ValidationStatus;
  result_json: JsonValue | null;
}

type StatusResponse =
  | { status: "processing" }
  | { status: "done"; result: JsonValue | null }
  | { status: "failed" };

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const id = context.params.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "Validation ID is required" }, { status: 400 });
  }

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("validations")
      .select("id, status, result_json")
      .eq("id", id)
      .maybeSingle<ValidationRow>();

    if (error) {
      return NextResponse.json({ error: "Failed to retrieve validation status" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Validation not found" }, { status: 404 });
    }

    let response: StatusResponse;

    if (data.status === "done") {
      response = {
        status: "done",
        result: data.result_json
      };
    } else if (data.status === "failed") {
      response = {
        status: "failed"
      };
    } else {
      response = {
        status: "processing"
      };
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
