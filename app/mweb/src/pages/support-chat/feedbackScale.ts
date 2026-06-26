/**
 * Shared 5-point support satisfaction scale (B8). The emoji + labels are
 * identical across mWeb, the mobile app and the support portal (CLAUDE rule 27),
 * so keep this list the single source of truth for both chat and ticket feedback.
 */
export interface FeedbackOption {
  value: number;
  emoji: string;
  label: string;
}

export const FEEDBACK_OPTIONS: readonly FeedbackOption[] = [
  { value: 1, emoji: '😠', label: 'Very Dissatisfied' },
  { value: 2, emoji: '🙁', label: 'Dissatisfied' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Satisfied' },
  { value: 5, emoji: '😍', label: 'Very Satisfied' },
];

/** The text shown after a rating has been submitted. */
export const FEEDBACK_THANK_YOU =
  'Thank you for your feedback. Your feedback helps us improve the Duncit support experience.';

/** Look up the emoji + label for a stored rating (1-5); null when out of range. */
export function feedbackOptionFor(rating: number | null | undefined): FeedbackOption | null {
  return FEEDBACK_OPTIONS.find((o) => o.value === rating) ?? null;
}
