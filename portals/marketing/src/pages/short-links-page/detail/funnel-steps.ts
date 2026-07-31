/**
 * The funnel, in order, with the plain-English label each step wears. The
 * server sends the same order; this only supplies the wording and the
 * drop-off arithmetic.
 */
export const STEP_LABELS: Record<string, string> = {
  CLICKED: 'Clicked the link',
  LANDED: 'Opened the app',
  SIGNED_UP: 'Signed in or signed up',
  SURVEY_DONE: 'Finished the signup survey',
  VIEWED_POD: 'Opened a pod',
  CHECKOUT_STARTED: 'Reached checkout',
  PAID: 'Paid',
};

export const stepLabel = (step: string) => STEP_LABELS[step] ?? step;

export interface FunnelRow {
  step: string;
  label: string;
  count: number;
  /** Share of the people who clicked, 0–100. */
  share: number;
  /** How many were lost since the previous step. */
  droppedFromPrevious: number;
}

/**
 * Turn raw counts into rows a person can read.
 *
 * Share is measured against the FIRST step rather than the previous one, so
 * the bars shorten monotonically and the picture is "of everyone who clicked,
 * this many got here" — which is the question being asked. Drop-off is kept
 * separately for the step-to-step story.
 */
export function toFunnelRows(steps: { step: string; count: number }[]): FunnelRow[] {
  const top = steps[0]?.count ?? 0;
  return steps.map((entry, index) => ({
    step: entry.step,
    label: stepLabel(entry.step),
    count: entry.count,
    share: top === 0 ? 0 : Math.round((entry.count / top) * 1000) / 10,
    droppedFromPrevious: index === 0 ? 0 : Math.max(0, steps[index - 1].count - entry.count),
  }));
}
