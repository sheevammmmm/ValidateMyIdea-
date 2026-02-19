"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  getValidationById,
  insertSignals,
  updateValidation,
  upsertFounderProfile,
  type DbClient
} from "@/lib/supabase/queries";
import type { TableInsert, TableUpdate } from "@/lib/supabase/database.types";
import { founderFitSchema } from "@/lib/validations/founderFitSchema";
import { runValidationEngine } from "@/lib/validation/engine";

export type RunValidationActionResult = {
  ok: boolean;
  message: string;
  validationId?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function runValidationAction(rawInput: unknown): Promise<RunValidationActionResult> {
  const parsed = founderFitSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the form errors before continuing.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const input = parsed.data;
  const supabase = createServerClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      message: "Please sign in to run validation."
    };
  }

  const db = supabase as DbClient;

  const { data: validation, error: validationError } = await getValidationById(db, input.validationId);
  if (validationError || !validation) {
    return {
      ok: false,
      message: "Validation draft not found. Please go back and save your idea again."
    };
  }

  if (validation.user_id !== user.id) {
    return {
      ok: false,
      message: "You do not have access to this validation draft."
    };
  }

  const domainExpertise = parseList(input.domainExpertise);
  const keySkills = parseList(input.keySkills);

  await upsertFounderProfile(db, {
    user_id: user.id,
    domain_expertise: domainExpertise,
    years_experience: input.yearsExperience,
    key_skills: keySkills,
    budget: input.budget,
    time_commitment: input.timeCommitment
  });

  await updateValidation(db, input.validationId, {
    status: "processing"
  });

  try {
    const engineResult = await runValidationEngine({
      ideaText: validation.idea_text,
      industry: validation.industry,
      targetCustomer: validation.target_customer,
      stage: validation.stage,
      founderProfile: {
        domainExpertise,
        yearsExperience: input.yearsExperience,
        keySkills,
        budget: input.budget,
        timeCommitment: input.timeCommitment
      }
    });

    await db.from("signals").delete().eq("validation_id", input.validationId);

    const signalRows: TableInsert<"signals">[] = engineResult.signals.map((signal) => ({
        validation_id: input.validationId,
        source: signal.source,
        data: {
          status: signal.status,
          highlights: signal.highlights,
          mentions: signal.mentions,
          error: signal.error,
          raw_json: JSON.stringify(signal.raw)
        },
        pain_quotes: signal.painQuotes,
        competitors: signal.competitors,
        demand_score: signal.demandScore
      }));

    if (signalRows.length > 0) {
      await insertSignals(db, signalRows);
    }

    const updatePayload: TableUpdate<"validations"> = {
      signal_score: engineResult.signalScore,
      founder_fit_score: engineResult.founderFitScore,
      verdict: engineResult.verdict,
      status: "completed",
      report_url: `/validate/report/${input.validationId}`
    };

    await updateValidation(db, input.validationId, updatePayload);

    revalidatePath("/dashboard");
    revalidatePath(`/validate/report/${input.validationId}`);

    return {
      ok: true,
      message: "Validation report generated successfully.",
      validationId: input.validationId
    };
  } catch (error) {
    await updateValidation(db, input.validationId, {
      status: "failed"
    });

    return {
      ok: false,
      message: error instanceof Error ? error.message : "Validation failed unexpectedly."
    };
  }
}
