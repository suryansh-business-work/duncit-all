import type { z } from 'zod';
import { mwebSmartIncentiveLabels, smartIncentivePctIssue } from '@duncit/utils';
import type { Translate } from '../../../i18n/fallback';
import { isFreePodType, type CreatePodFormValues } from './create-pod.types';

/**
 * The Smart Incentive rule of Step 4, as a Zod issue: switched on, a paid pod
 * needs a whole discount from 1% up to Loyalty's maximum.
 *
 * The rule lives in `@duncit/utils` (`smartIncentivePctIssue`) so the native
 * stepper, the Edit Pod sheets and the server's twin agree on it; this only
 * places the issue on the field and words it in the reader's language. A FREE
 * pod is skipped — it never carries the incentive, and the input builder sends
 * it switched off. So is a null `maxPct`: the programme is not known to be on,
 * the editor is hidden, and a value the host cannot see must never block publish.
 */
export function refineSmartIncentive(
  values: CreatePodFormValues,
  ctx: z.RefinementCtx,
  t: Translate,
  maxPct: number | null,
) {
  if (maxPct === null || !values.smart_incentive_enabled || isFreePodType(values.pod_type)) return;
  const issue = smartIncentivePctIssue(values.smart_incentive_pct, maxPct);
  if (!issue) return;
  ctx.addIssue({
    code: 'custom',
    path: ['smart_incentive_pct'],
    message: mwebSmartIncentiveLabels(t).errors[issue](maxPct),
  });
}
