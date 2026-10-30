import { z } from 'zod';
import { FREE_DETAILS_LIMITS, FREE_VALIDATION_KEYS, freeJustificationProblem } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * The justification a host gives when they pick "Free" — for the pod, for the
 * venue, or both: why it is free (an initiative, a promotion, an approved
 * campaign, or another reason explained in `free_details`) and their acceptance
 * of Duncit's free policy. Create Pod (mWeb and the native app), the resubmit
 * forms and the Partners pod form embed these three fields and call
 * `addFreeJustificationIssues` from their own `superRefine` whenever the pod or
 * its venue is free; `freeJustificationInput` (`@duncit/utils`) turns them into
 * the input the server takes.
 */
export const freeJustificationFields = {
  free_reason: z.string(),
  free_details: z.string(),
  free_accepted: z.boolean(),
};

export interface FreeJustificationValues {
  free_reason: string;
  free_details: string;
  free_accepted: boolean;
}

export const freeJustificationDefaults: FreeJustificationValues = { free_reason: '', free_details: '', free_accepted: false };

/** The field each problem is reported on. */
const ISSUE_PATH: Readonly<Record<keyof typeof FREE_VALIDATION_KEYS, keyof FreeJustificationValues>> = {
  reason: 'free_reason',
  details: 'free_details',
  detailsTooLong: 'free_details',
  accept: 'free_accepted',
};

/**
 * Adds the first thing missing from a free justification as an issue on its
 * own field — the same checks, in the same order, as the server's
 * `cleanFreeJustification`. Call it only while the pod or its venue is free.
 */
export function addFreeJustificationIssues(values: Readonly<FreeJustificationValues>, ctx: z.RefinementCtx, t: Translate): void {
  const problem = freeJustificationProblem({
    reason: values.free_reason,
    details: values.free_details,
    accepted: values.free_accepted,
  });
  if (!problem) return;
  ctx.addIssue({
    code: 'custom',
    path: [ISSUE_PATH[problem]],
    message: t(FREE_VALIDATION_KEYS[problem], { vars: { max: FREE_DETAILS_LIMITS.max } }),
  });
}
