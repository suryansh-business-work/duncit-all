/** The 5-point satisfaction scale — identical across mWeb, native and portal. */
export interface FeedbackOption {
  value: number;
  emoji: string;
  label: string;
}

export const FEEDBACK_SCALE: readonly FeedbackOption[] = [
  { value: 1, emoji: '😠', label: 'Very Dissatisfied' },
  { value: 2, emoji: '🙁', label: 'Dissatisfied' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Satisfied' },
  { value: 5, emoji: '😍', label: 'Very Satisfied' },
];

/** The chosen scale row for a 1-5 rating, or null when out of range. */
export function feedbackOption(rating?: number | null): FeedbackOption | null {
  return FEEDBACK_SCALE.find((o) => o.value === rating) ?? null;
}
