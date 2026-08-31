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
 * This is a statement about what is WIRED, not about what is configured. EMAIL
 * and WHATSAPP both have a provider behind them; a deployment that has not
 * pasted its AiSensy key yet gets a FAILED delivery and the reason, which is
 * the honest answer — not "this medium does not exist".
 */
const TRANSPORTS: Record<OtpMedium, boolean> = {
  SMS: false,
  WHATSAPP: true,
  EMAIL: true,
};

export const hasOtpTransport = (medium: OtpMedium): boolean => TRANSPORTS[medium] ?? false;
