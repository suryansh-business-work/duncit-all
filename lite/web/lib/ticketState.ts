import type { LitePaymentStatus, LiteRegistrationStatus } from '../../shared/graphql/documents';

/**
 * The check-in code and QR admit someone, so they show only once the seat is
 * confirmed (paid and accepted by the host). The API refuses a check-in for any
 * other status too; hiding them keeps a guest from walking up with a code that
 * will not work.
 */
export const showsCheckInCode = (status: LiteRegistrationStatus): boolean => status === 'CONFIRMED';

/** Cancelled and declined tickets never get a code, so there is nothing to promise. */
export const awaitsCheckInCode = (status: LiteRegistrationStatus): boolean => status === 'PAYMENT_PENDING' || status === 'PENDING_APPROVAL' || status === 'WAITLISTED';

/**
 * "Awaiting payment" only repeats "Payment pending" while the seat waits on the
 * payment, so the payment chip shows when it says something new (paid, rejected).
 */
export const showsPaymentChip = (status: LiteRegistrationStatus, payment: LitePaymentStatus): boolean =>
  payment !== 'NOT_REQUIRED' && !(status === 'PAYMENT_PENDING' && payment === 'PENDING');
