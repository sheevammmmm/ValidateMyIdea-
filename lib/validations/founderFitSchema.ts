import { z } from "zod";

export const YEARS_EXPERIENCE_OPTIONS = ["0-1", "2-4", "5-8", "9+"] as const;
export const BUDGET_OPTIONS = ["<$500/mo", "$500-$2k/mo", "$2k-$10k/mo", "$10k+/mo"] as const;
export const TIME_COMMITMENT_OPTIONS = ["<5 hrs/week", "5-10 hrs/week", "10-20 hrs/week", "20+ hrs/week"] as const;

export const founderFitSchema = z.object({
  validationId: z.string().uuid("Invalid validation id"),
  domainExpertise: z
    .string()
    .trim()
    .min(3, "Add at least one domain expertise area")
    .max(220, "Domain expertise is too long"),
  yearsExperience: z.enum(YEARS_EXPERIENCE_OPTIONS, {
    errorMap: () => ({ message: "Select your years of experience" })
  }),
  keySkills: z
    .string()
    .trim()
    .min(3, "Add at least one key skill")
    .max(220, "Key skills are too long"),
  budget: z.enum(BUDGET_OPTIONS, {
    errorMap: () => ({ message: "Select your available budget" })
  }),
  timeCommitment: z.enum(TIME_COMMITMENT_OPTIONS, {
    errorMap: () => ({ message: "Select your weekly time commitment" })
  })
});

export type FounderFitValues = z.infer<typeof founderFitSchema>;
