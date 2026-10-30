import { z } from 'zod';
import {
  mwebSmartIncentiveLabels,
  smartIncentivePctIssue,
  type SmartIncentiveValues,
} from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/**
 * Smart Incentive's form wiring, shared by the Create / Club Admin stepper and
 * the host's Edit Pod sheet so both validate one way. The rules live in
 * @duncit/utils; this only feeds them Loyalty's maximum and turns their issue
 * code into a Zod issue on the percentage. mWeb twin: create-pod.smart-incentive.
 */

export type { SmartIncentiveValues } from '@duncit/utils';

export const blankSmartIncentiveValues: SmartIncentiveValues = {
  smart_incentive_enabled: false,
  smart_incentive_pct: '',
};

/** Zod shape of the two values; the percentage rule runs in `refineSmartIncentive`. */
export const smartIncentiveSchemaShape = {
  smart_incentive_enabled: z.boolean(),
  smart_incentive_pct: z.string(),
};

/**
 * Adds the percentage's issue, if any — only while the incentive is switched
 * on for a paid pod. `maxPct` is Loyalty's `max_discount_pct`, or null while
 * the programme is not known to be on: the editor is hidden then, and a value
 * the host cannot see (a draft's, a Host Again copy's) must never block a save
 * with an error nobody can read.
 */
export function refineSmartIncentive(
  input: Readonly<SmartIncentiveValues & { free: boolean }>,
  ctx: z.RefinementCtx,
  t: Translate,
  maxPct: number | null,
): void {
  if (maxPct === null || input.free || !input.smart_incentive_enabled) return;
  const issue = smartIncentivePctIssue(input.smart_incentive_pct, maxPct);
  if (!issue) return;
  ctx.addIssue({
    code: 'custom',
    path: ['smart_incentive_pct'],
    message: mwebSmartIncentiveLabels(t).errors[issue](maxPct),
  });
}

/**
 * A stored draft's incentive values, made safe to put back in the form: a
 * payload from before the feature (or a hand-edited one) may hold anything.
 */
export function hydrateSmartIncentive(
  values: Readonly<{ smart_incentive_enabled?: unknown; smart_incentive_pct?: unknown }>,
): SmartIncentiveValues {
  const pct = values.smart_incentive_pct;
  return {
    smart_incentive_enabled: values.smart_incentive_enabled === true,
    smart_incentive_pct: typeof pct === 'string' || typeof pct === 'number' ? String(pct) : '',
  };
}
