import { logs } from '@observability/log';
import type { IFailedPaymentCase } from './failedPaymentCase.model';
import { liveRefundCheck, refundEligibility, RefundRefusal } from './failedPayment.refund';

/**
 * What a refund of this case would do right now, without doing it: the rupees
 * Razorpay would send back and to which payment, or the reason it cannot.
 *
 * Finance sees this in the Refund dialog before confirming, and the AI note
 * reads it, so neither ever guesses. It runs the SAME eligibility rule and the
 * SAME live Razorpay check as the refund itself; it claims nothing and writes
 * nothing, so asking twice is harmless.
 */
export interface RefundPreview {
  refundable: boolean;
  /** Rupees, when refundable. */
  amount: number | null;
  razorpay_payment_id: string | null;
  reason: string | null;
}

const refused = (reason: string): RefundPreview => ({ refundable: false, amount: null, razorpay_payment_id: null, reason });

export async function refundPreviewFor(kase: IFailedPaymentCase): Promise<RefundPreview> {
  const ineligible = refundEligibility(kase);
  if (ineligible) return refused(ineligible);
  if (kase.refund.status === 'PENDING') return refused('This refund is already on its way to Razorpay.');
  try {
    const { razorpayPaymentId, amountPaise } = await liveRefundCheck(kase);
    return { refundable: true, amount: amountPaise / 100, razorpay_payment_id: razorpayPaymentId, reason: null };
  } catch (error) {
    if (error instanceof RefundRefusal) return refused(error.message);
    logs.server.warn('failedPayment', 'refundPreview', { error, case_id: String(kase._id) });
    return refused('Razorpay could not be reached. Try again in a minute.');
  }
}
