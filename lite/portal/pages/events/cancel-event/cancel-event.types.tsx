import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';

export interface CancelEventValues {
  reason: string;
}

const REASON_MAX = 500;

/** The reason is optional; the confirmation itself is the point. */
export const makeCancelEventSchema = (t: Translate) =>
  z.object({
    reason: z
      .string()
      .trim()
      .max(REASON_MAX, t('litePortal.validation.max', { vars: { field: t('litePortal.events.cancelReason'), max: REASON_MAX } })),
  });
