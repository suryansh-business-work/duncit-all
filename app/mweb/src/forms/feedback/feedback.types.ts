import { z } from 'zod';

/**
 * "Report a problem / feedback" form schema. `category` is one of the shared
 * FEEDBACK_CATEGORIES (constrained by the select); the message must be a real
 * sentence so the team gets something actionable.
 */
export const feedbackSchema = z.object({
  category: z.string().min(1, 'Pick a category'),
  message: z
    .string()
    .trim()
    .min(10, 'Please describe it in at least 10 characters')
    .max(2000, 'Please keep it under 2000 characters'),
});

export type FeedbackValues = z.infer<typeof feedbackSchema>;

export const feedbackDefaults: FeedbackValues = { category: 'Bug', message: '' };
