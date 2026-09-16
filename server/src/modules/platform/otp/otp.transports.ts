import type { OtpMedium } from './otp.model';

/**
 * Which mediums have a real transport behind them.
 *
 * Its own module, and not part of `otp.delivery`, because two things need the
 * answer and one of them is upstream of the other: `commPreferenceService` asks
 * it to decide whether a channel could carry a code at all, and `deliverOtp`
 * asks it on the way out — but `deliverOtp` now reaches the mailer, which
 * reaches `commPreferenceService`. Holding the table here is what keeps that
 * from closing a cycle.
 *
 * This is a statement about what is WIRED, not about what is configured. EMAIL,
 * WHATSAPP (AiSensy) and SMS (MSG91) all have a provider behind them, so none is
 * refused here.
 * Whether that provider has actually been given its key is a different question
 * and belongs at the seam: a deployment that has not pasted its AiSensy or MSG91
 * key yet gets a STUBBED delivery from `deliverOtp` for that medium, while a key
 * that IS present and then fails is FAILED, which is what keeps an outage from
 * ever becoming a bypass.
 */
const TRANSPORTS: Record<OtpMedium, boolean> = {
  SMS: true,
  WHATSAPP: true,
  EMAIL: true,
};

export const hasOtpTransport = (medium: OtpMedium): boolean => TRANSPORTS[medium] ?? false;
