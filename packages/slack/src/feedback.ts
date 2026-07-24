import { header, section } from './blocks';
import type { AppFeedbackInput, FeedbackCategory, SlackBlock } from './types';

/** Categories offered in the in-app "Report a problem / feedback" form.
 * Reusable UI config, shared so mWeb + mobile stay identical. A definite tuple
 * so `FEEDBACK_CATEGORIES[0]` is a known value under strict index checks. */
export const FEEDBACK_CATEGORIES = [
  'Bug',
  'Idea',
  'Question',
  'Other',
] as const satisfies readonly FeedbackCategory[];

/** Block Kit body for an in-app feedback post. Shared by mWeb + mobile so both
 * twins produce an identical message; the server appends a trusted identity. */
export const buildFeedbackBlocks = (input: {
  category: string;
  message: string;
}): SlackBlock[] => [header(`📝 ${input.category}`), section(input.message)];

/** Turn a feedback form into the `submitAppFeedback` mutation input, with the
 * message body pre-composed via {@link buildFeedbackBlocks}. */
export const buildAppFeedbackInput = (input: {
  category: string;
  message: string;
  platform?: string;
}): AppFeedbackInput => ({
  category: input.category,
  message: input.message,
  platform: input.platform,
  blocks_json: JSON.stringify(buildFeedbackBlocks(input)),
});
