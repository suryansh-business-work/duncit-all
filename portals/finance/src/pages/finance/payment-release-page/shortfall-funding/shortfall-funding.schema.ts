import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';

/** The shortest funding note the server accepts (MIN_SHORTFALL_FUNDING_NOTE), counted after trimming. */
export const SHORTFALL_NOTE_MIN = 10;

/** The longest funding note a payout release stores. */
export const SHORTFALL_NOTE_MAX = 2000;

/** The words a funding note is refused with — one copy for both approval paths. */
export const fundingNoteMessages = (t: Translate) => ({
  tooShort: t('finance.paymentRelease.fundingNoteTooShort', { vars: { min: SHORTFALL_NOTE_MIN } }),
  tooLong: t('finance.paymentRelease.fundingNoteTooLong', { vars: { max: SHORTFALL_NOTE_MAX } }),
});

/**
 * "Approve all payouts" on a request whose payouts send out more than its pod
 * collected. That money leaves from somewhere other than the pod, so the
 * server approves it only with a note saying who funds it — required, and at
 * least as long as the server's own floor, so a refusal never has to come back
 * from the server for a rule the form could have stated.
 */
export const shortfallFundingSchema = (t: Translate = fallbackT) => {
  const messages = fundingNoteMessages(t);
  return z.object({
    note: z.string().trim().min(SHORTFALL_NOTE_MIN, messages.tooShort).max(SHORTFALL_NOTE_MAX, messages.tooLong),
  });
};
