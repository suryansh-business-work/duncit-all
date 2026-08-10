import { z } from 'zod';

/**
 * "Report a problem / feedback" form schema.
 *
 * `message` has no fixed minimum here: how long a report has to be is admin
 * configuration now (`reportProblemConfig.message_min_length`), so the rule is
 * built per-render from what the server answered rather than frozen at 10.
 * `media_urls` are newline-joined, matching the media field's own contract and
 * the native twin's (rule 27).
 */
export const buildFeedbackSchema = (minLength: number) =>
  z.object({
    category: z.string().min(1, 'Pick a category'),
    message: z
      .string()
      .trim()
      .min(minLength, `Please describe it in at least ${minLength} characters`)
      .max(2000, 'Please keep it under 2000 characters'),
    media_text: z.string(),
  });

export type FeedbackValues = z.infer<ReturnType<typeof buildFeedbackSchema>>;

export const feedbackDefaults: FeedbackValues = { category: '', message: '', media_text: '' };

/** The schema resolved against the default minimum — for callers that parse it
 * outside React (and the module-level export the tests use). */
export const feedbackSchema = buildFeedbackSchema(10);
