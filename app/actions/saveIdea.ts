"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveIdeaInputSchema, type SaveIdeaInput } from "@/lib/validations/ideaSchema";

export type SaveIdeaActionResult = {
  ok: boolean;
  message: string;
  validationId?: string;
  savedAt?: string;
  fieldErrors?: Record<string, string[]>;
};

function validationErrorResult(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): SaveIdeaActionResult {
  return {
    ok: false,
    message: "Please fix the validation errors before saving.",
    fieldErrors: error.flatten().fieldErrors
  };
}

export async function saveIdeaAction(rawInput: unknown): Promise<SaveIdeaActionResult> {
  const parsed = saveIdeaInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  const input: SaveIdeaInput = parsed.data;
  const supabase = createClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      message: "Please sign in to save your validation draft."
    };
  }

  const payload = {
    idea_text: input.ideaText.trim(),
    industry: input.industry,
    target_customer: input.targetCustomer?.trim() || null,
    stage: input.stage,
    status: "processing" as const
  };

  try {
    if (input.validationId) {
      const { data, error } = await supabase
        .from("validations")
        .update(payload)
        .eq("id", input.validationId)
        .eq("user_id", user.id)
        .select("id, updated_at")
        .maybeSingle();

      if (error) {
        return {
          ok: false,
          message: error.message
        };
      }

      if (!data) {
        return {
          ok: false,
          message: "Draft not found. Please refresh and try again."
        };
      }

      revalidatePath("/validate");
      revalidatePath("/dashboard");

      return {
        ok: true,
        message: input.mode === "continue" ? "Draft saved. Continuing to founder fit quiz." : "Draft auto-saved.",
        validationId: data.id,
        savedAt: data.updated_at ?? undefined
      };
    }

    const { data, error } = await supabase
      .from("validations")
      .insert({
        user_id: user.id,
        ...payload
      })
      .select("id, created_at")
      .single();

    if (error) {
      return {
        ok: false,
        message: error.message
      };
    }

    revalidatePath("/validate");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: input.mode === "continue" ? "Idea saved. Continuing to founder fit quiz." : "Draft auto-saved.",
      validationId: data.id,
      savedAt: data.created_at
    };
  } catch {
    return {
      ok: false,
      message: "Unexpected error while saving. Please try again."
    };
  }
}
