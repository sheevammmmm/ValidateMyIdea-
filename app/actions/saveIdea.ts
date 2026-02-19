"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  createValidation,
  updateValidation,
  type DbClient
} from "@/lib/supabase/queries";
import type { TableInsert, TableUpdate } from "@/lib/supabase/database.types";
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
  const supabase = createServerClient();

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

  const sharedPayload = {
    idea_text: input.ideaText.trim(),
    industry: input.industry,
    target_customer: input.targetCustomer?.trim() || null,
    stage: input.stage,
    status: "processing" as const
  };

  try {
    if (input.validationId) {
      const updatePayload: TableUpdate<"validations"> = sharedPayload;
      const { data, error } = await updateValidation(supabase as DbClient, input.validationId, updatePayload);

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
        savedAt: data.updated_at
      };
    }

    const insertPayload: TableInsert<"validations"> = {
      user_id: user.id,
      ...sharedPayload
    };
    const { data, error } = await createValidation(supabase as DbClient, insertPayload);

    if (error) {
      return {
        ok: false,
        message: error.message
      };
    }
    if (!data) {
      return {
        ok: false,
        message: "Validation draft could not be created."
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
