import type { IPayment } from '@modules/finance/payment/payment.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';

/**
 * Whether the money on a payment row already bought a booking. Two signals,
 * either is enough: the finalizer committed the booking core (CORE_DONE /
 * COMPLETE), or a pod membership was written against this payment (backed out
 * included — its refund belongs to the Backout flow, not this one).
 */
export interface BookingInfo {
  exists: boolean;
  /** The Razorpay payment the booking was made with; null when none or unknown. */
  bookedRazorpayPaymentId: string | null;
}

export async function bookingFor(payment: Pick<IPayment, '_id' | 'finalize_state' | 'metadata'>): Promise<BookingInfo> {
  const committed = payment.finalize_state === 'CORE_DONE' || payment.finalize_state === 'COMPLETE';
  const exists = committed || !!(await PodMemberModel.exists({ payment_id: payment._id }));
  const booked = String(payment.metadata?.razorpay_payment_id ?? '');
  return { exists, bookedRazorpayPaymentId: exists && booked ? booked : null };
}
