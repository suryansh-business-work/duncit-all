/** The 1-5 satisfaction emoji scale — identical across mWeb, native and portal. */
export interface FeedbackOption {
  value: number;
  emoji: string;
  label: string;
}

export const FEEDBACK_OPTIONS: ReadonlyArray<FeedbackOption> = [
  { value: 1, emoji: '😠', label: 'Very Dissatisfied' },
  { value: 2, emoji: '🙁', label: 'Dissatisfied' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Satisfied' },
  { value: 5, emoji: '😍', label: 'Very Satisfied' },
];

export function feedbackOption(rating: number | null | undefined): FeedbackOption | null {
  return FEEDBACK_OPTIONS.find((o) => o.value === rating) ?? null;
}
