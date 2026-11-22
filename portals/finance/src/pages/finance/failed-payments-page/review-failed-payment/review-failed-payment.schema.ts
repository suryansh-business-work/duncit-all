import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { ReviewFailedPaymentMode } from './review-failed-payment.types';

/** The longest note the server stores with a decision. */
export const REVIEW_NOTE_MAX = 1000;

/**
 * A rejection and a bank-reversal close both reach the buyer as the reason
 * their ticket was resolved, so neither may go without a note. An approval
 * only unlocks the refund button, so its note is optional.
 */
export const reviewFailedPaymentSchema = (mode: ReviewFailedPaymentMode, t: Translate = fallbackT) =>
  z
    .object({
      decision: z.enum(['APPROVED', 'REJECTED']),
      note: z.string().trim().max(REVIEW_NOTE_MAX, t('finance.failedPayments.noteTooLong')),
    })
    .superRefine((values, ctx) => {
      const needsNote = mode === 'NOT_REFUNDABLE' || values.decision === 'REJECTED';
      if (needsNote && !values.note) {
        ctx.addIssue({ code: 'custom', path: ['note'], message: t('finance.failedPayments.noteRequired') });
      }
    });
