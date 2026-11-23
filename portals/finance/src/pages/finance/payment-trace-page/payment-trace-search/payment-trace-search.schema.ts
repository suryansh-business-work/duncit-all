import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';

/** The longest id the server will look up; no id Duncit or Razorpay issues comes close. */
export const TRACE_REF_MAX = 100;

/**
 * Any id is matched exactly on the server, never as a pattern, so the only
 * rules are the server's own: something to look for, and not too long.
 */
export const paymentTraceSearchSchema = (t: Translate = fallbackT) =>
  z.object({
    ref: z
      .string()
      .trim()
      .min(1, t('finance.paymentTrace.refRequired'))
      .max(TRACE_REF_MAX, t('finance.paymentTrace.refTooLong')),
  });
