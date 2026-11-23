import { z } from 'zod';
import type { Translator } from '@duncit/app-settings';

/** The shortest and longest note the server accepts with a refund. */
export const REFUND_NOTE_MIN = 3;
export const REFUND_NOTE_MAX = 500;

/**
 * A refund moves money out, so it never goes without a reason on record. The
 * note is trimmed first: three spaces are not a reason. The server checks the
 * same bounds again.
 */
export const refundToSourceSchema = (t: Translator['t']) =>
  z.object({
    note: z
      .string()
      .trim()
      .min(REFUND_NOTE_MIN, t('finance.payment.refundArea.noteRequired'))
      .max(REFUND_NOTE_MAX, t('finance.payment.refundArea.noteTooLong')),
  });

export interface RefundToSourceValues {
  note: string;
}
