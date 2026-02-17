import { z } from "zod";

export const INDUSTRY_OPTIONS = [
  "AI/ML",
  "SaaS",
  "E-commerce",
  "Healthcare",
  "Fintech",
  "EdTech",
  "Marketing",
  "DevTools",
  "Other"
] as const;

export const STAGE_OPTIONS = [
  {
    value: "pre-idea",
    label: "Pre-idea (just brainstorming)"
  },
  {
    value: "mvp",
    label: "MVP (building)"
  },
  {
    value: "launched",
    label: "Launched (testing)"
  }
] as const;

export const ideaSchema = z.object({
  ideaText: z
    .string()
    .trim()
    .min(250, "Idea description must be at least 250 characters")
    .max(1000, "Idea description must be at most 1000 characters"),
  industry: z.enum(INDUSTRY_OPTIONS, {
    errorMap: () => ({ message: "Please select an industry" })
  }),
  targetCustomer: z
    .string()
    .trim()
    .max(180, "Target customer should be 180 characters or fewer")
    .optional()
    .or(z.literal("")),
  stage: z.enum(["pre-idea", "mvp", "launched"], {
    errorMap: () => ({ message: "Please select your current stage" })
  })
});

export const saveIdeaInputSchema = ideaSchema.extend({
  validationId: z.string().uuid().optional(),
  mode: z.enum(["autosave", "continue"]).default("autosave")
});

export type IdeaFormValues = z.infer<typeof ideaSchema>;
export type SaveIdeaInput = z.infer<typeof saveIdeaInputSchema>;
export type StageValue = (typeof STAGE_OPTIONS)[number]["value"];
