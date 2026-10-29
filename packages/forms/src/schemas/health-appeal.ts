import { z } from 'zod';
import { HEALTH_APPEAL_MESSAGE_MAX, isHealthAppealReason } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * Appealing one health deduction — mWeb's dialog and the native sheet ask the
 * same two things: why (one of the reasons the server stores) and the words
 * Legal decides on. The limit is the server's own, so the form refuses exactly
 * what the server would (rules 27 + 40). Every refusal is a `healthAppeal.*`
 * key both apps ship (rule 38).
 */
export function makeHealthAppealSchema(t: Translate) {
  return z.object({
    // A plain boolean check, not a type guard (TS infers one from a bare arrow):
    // Zod would narrow the value to the enum and refuse the blank "nothing
    // picked yet" default. The surfaces narrow with `isHealthAppealReason`.
    reason: z
      .string()
      .refine((value): boolean => isHealthAppealReason(value), t('healthAppeal.reasonRequired')),
    message: z
      .string()
      .trim()
      .min(1, t('healthAppeal.messageRequired'))
      .max(
        HEALTH_APPEAL_MESSAGE_MAX,
        t('healthAppeal.messageTooLong', { vars: { max: String(HEALTH_APPEAL_MESSAGE_MAX) } }),
      ),
  });
}

export type HealthAppealValues = z.infer<ReturnType<typeof makeHealthAppealSchema>>;

/** Nothing picked yet: the person chooses the reason themselves. */
export const healthAppealDefaults: HealthAppealValues = { reason: '', message: '' };
