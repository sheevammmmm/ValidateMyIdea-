"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  calculateFounderFit,
  type FounderFitResult,
  type FounderProfileDraft,
  type Validation,
  BUDGET_OPTIONS,
  DOMAIN_EXPERTISE_OPTIONS,
  isFounderProfileComplete,
  KEY_SKILL_OPTIONS,
  normalizeFounderProfileDraft,
  TIME_COMMITMENT_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS
} from "@/lib/scoring/founderFit";
import { createClient } from "@/lib/supabase/server";
import { getValidationById, updateValidation, upsertFounderProfile, type DbClient } from "@/lib/supabase/queries";

const profileDraftSchema = z.object({
  domainExpertise: z.array(z.enum(DOMAIN_EXPERTISE_OPTIONS)).max(11).default([]),
  yearsExperience: z.enum(YEARS_EXPERIENCE_OPTIONS).optional(),
  keySkills: z.array(z.enum(KEY_SKILL_OPTIONS)).max(7).default([]),
  budget: z.enum(BUDGET_OPTIONS).optional(),
  timeCommitment: z.enum(TIME_COMMITMENT_OPTIONS).optional()
});

const completeProfileSchema = profileDraftSchema.extend({
  domainExpertise: z.array(z.enum(DOMAIN_EXPERTISE_OPTIONS)).min(1, "Select at least one domain expertise area."),
  yearsExperience: z.enum(YEARS_EXPERIENCE_OPTIONS, {
    errorMap: () => ({ message: "Select your years of relevant experience." })
  }),
  keySkills: z.array(z.enum(KEY_SKILL_OPTIONS)).min(1, "Select at least one key skill."),
  budget: z.enum(BUDGET_OPTIONS, {
    errorMap: () => ({ message: "Select your MVP budget." })
  }),
  timeCommitment: z.enum(TIME_COMMITMENT_OPTIONS, {
    errorMap: () => ({ message: "Select your time commitment." })
  })
});

const saveFounderProfileInputSchema = profileDraftSchema.extend({
  validationId: z.string().uuid().optional(),
  mode: z.enum(["autosave", "complete"]).default("autosave")
});

export type SaveFounderProfileActionResult = {
  ok: boolean;
  message: string;
  savedAt?: string;
  validationId?: string;
  founderFit?: FounderFitResult;
  fieldErrors?: Record<string, string[] | undefined>;
};

function toValidationErrorResult(error: z.ZodError): SaveFounderProfileActionResult {
  return {
    ok: false,
    message: "Please answer the required quiz questions before continuing.",
    fieldErrors: error.flatten().fieldErrors
  };
}

function toValidationContext(validationRow: {
  id: string;
  industry: string | null;
  idea_text: string;
  stage: "pre-idea" | "mvp" | "launched";
}): Validation {
  return {
    id: validationRow.id,
    industry: validationRow.industry,
    ideaText: validationRow.idea_text,
    stage: validationRow.stage
  };
}

function fallbackValidationContext(profile: FounderProfileDraft): Validation {
  return {
    industry: profile.domainExpertise[0] ?? "General",
    ideaText: null,
    stage: null
  };
}

export async function saveFounderProfileAction(rawInput: unknown): Promise<SaveFounderProfileActionResult> {
  const parsed = saveFounderProfileInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return toValidationErrorResult(parsed.error);
  }

  const input = parsed.data;
  const normalizedProfile = normalizeFounderProfileDraft({
    domainExpertise: input.domainExpertise,
    yearsExperience: input.yearsExperience,
    keySkills: input.keySkills,
    budget: input.budget,
    timeCommitment: input.timeCommitment
  });

  if (input.mode === "complete") {
    const completeCheck = completeProfileSchema.safeParse(normalizedProfile);
    if (!completeCheck.success) {
      return toValidationErrorResult(completeCheck.error);
    }
  }

  const supabase = createClient();
  const dbClient = supabase as unknown as DbClient;

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      message: "Please sign in to save your founder profile."
    };
  }

  const { data: profileRow, error: upsertError } = await upsertFounderProfile(dbClient, {
    user_id: user.id,
    domain_expertise: normalizedProfile.domainExpertise,
    years_experience: normalizedProfile.yearsExperience ?? null,
    key_skills: normalizedProfile.keySkills,
    budget: normalizedProfile.budget ?? null,
    time_commitment: normalizedProfile.timeCommitment ?? null
  });

  if (upsertError || !profileRow) {
    return {
      ok: false,
      message: upsertError?.message ?? "Could not save founder profile."
    };
  }

  let founderFit: FounderFitResult | undefined;

  if (isFounderProfileComplete(normalizedProfile)) {
    let ideaContext: Validation = fallbackValidationContext(normalizedProfile);

    if (input.validationId) {
      const { data: validationRow, error: validationError } = await getValidationById(dbClient, input.validationId);

      if (validationError) {
        return {
          ok: false,
          message: validationError.message
        };
      }

      if (validationRow?.user_id === user.id) {
        ideaContext = toValidationContext(validationRow);
      }
    }

    founderFit = calculateFounderFit(ideaContext, normalizedProfile);

    if (input.validationId && founderFit) {
      const { error: updateError } = await updateValidation(dbClient, input.validationId, {
        founder_fit_score: founderFit.score,
        status: "processing"
      });

      if (updateError) {
        return {
          ok: false,
          message: updateError.message
        };
      }
    }
  }

  revalidatePath("/validate/founder-fit");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      input.mode === "complete"
        ? "Founder profile saved. Here is your founder-market fit analysis."
        : "Founder profile auto-saved.",
    savedAt: profileRow.updated_at,
    validationId: input.validationId,
    founderFit
  };
}
