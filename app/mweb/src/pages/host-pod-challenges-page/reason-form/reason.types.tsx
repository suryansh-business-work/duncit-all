import { z } from 'zod';

type Translate = (key: string) => string;

export const REASON_MAX = 300;

/** Why a score is removed or a result corrected — kept in the audit trail. */
export const buildReasonSchema = (t: Translate, required: boolean) =>
  z.object({
    reason: required
      ? z.string().trim().min(3, t('mweb.challenge.errors.reason')).max(REASON_MAX, t('mweb.challenge.errors.reasonLong'))
      : z.string().trim().max(REASON_MAX, t('mweb.challenge.errors.reasonLong')),
  });

export type ReasonValues = z.infer<ReturnType<typeof buildReasonSchema>>;
