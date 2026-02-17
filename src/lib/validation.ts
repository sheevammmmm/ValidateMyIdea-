import { z } from "zod";

export const waitlistSchema = z.object({
  email: z.string().email(),
  useCase: z.string().trim().min(3).max(200).optional()
});

export type WaitlistPayload = z.infer<typeof waitlistSchema>;
