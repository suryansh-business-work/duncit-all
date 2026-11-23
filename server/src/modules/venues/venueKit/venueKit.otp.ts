import { GraphQLError } from 'graphql';
import { OTP_TTL_MINUTES } from '@modules/platform/otp/otp.constants';
import { OtpChallengeModel, type IOtpChallenge } from '@modules/platform/otp/otp.model';
import { anyDelivered, otpService, type PhoneOtpRequestResult } from '@modules/platform/otp/otp.service';
import { validate } from '@utils/validate';
import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
} from './venueKit.validator';

/**
 * The Venue Kit form's two proofs, both through the ONE shared `otpService`.
 *
 * Email is required and goes first. The phone code is optional, SMS only, +91
 * only — and it can only be asked for while holding a live email grant. That
 * ordering is the guard against SMS pumping from an anonymous page: the
 * captcha gates the email send, and a proved mailbox gates every text.
 */

export interface VenueKitOtpRequest {
  expires_at: string;
  resend_after_seconds: number;
  expires_in_minutes: number;
  /** Whether a medium really carried the code — the form says "check your inbox" only when it did. */
  sent: boolean;
  /** Echoed back ONLY while no provider is configured; null whenever a real send happened. */
  test_code: string | null;
}

const toRequestResult = (issued: PhoneOtpRequestResult): VenueKitOtpRequest => ({
  expires_at: issued.expires_at,
  resend_after_seconds: issued.resend_after_seconds,
  expires_in_minutes: OTP_TTL_MINUTES,
  sent: anyDelivered(issued.deliveries),
  test_code: issued.test_code,
});

/** A configured provider that refused is an error the person can act on, never a silent "sent". */
function assertCarried(issued: PhoneOtpRequestResult, what: string): void {
  if (anyDelivered(issued.deliveries) || issued.test_code) return;
  const reason = issued.deliveries.find((d) => d.reason)?.reason;
  throw new GraphQLError(`We could not send the code to your ${what}. ${reason ?? 'Please try again.'}`.trim(), {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

/** Different mobiles one proved mailbox may text in an hour — a venue corrects a typo, a script sprays numbers. */
export const PHONES_PER_EMAIL_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

/**
 * One email proof must not become an open SMS relay: a resend to the SAME
 * number reuses its challenge (and its own cooldown), but a NEW number counts
 * against the mailbox's hourly allowance.
 */
async function assertPhoneBudget(email: string, phoneNumber: string): Promise<void> {
  const numbers: string[] = await OtpChallengeModel.distinct('phone_number', {
    purpose: 'VENUE_KIT_PHONE',
    'context.email': email,
    created_at: { $gt: new Date(Date.now() - HOUR_MS) },
  });
  if (numbers.includes(phoneNumber) || numbers.length < PHONES_PER_EMAIL_PER_HOUR) return;
  throw new GraphQLError('Too many different numbers for this email — try again in an hour', {
    extensions: { code: 'TOO_MANY_REQUESTS' },
  });
}

export const venueKitOtp = {
  async requestEmail(input: unknown, requestedBy: string | null): Promise<VenueKitOtpRequest> {
    const { name, email } = await validate(emailOtpRequestSchema, input);
    const issued = await otpService.request({
      purpose: 'VENUE_KIT_EMAIL',
      mediums: ['EMAIL'],
      email,
      recipient_name: name,
      requested_by: requestedBy,
    });
    assertCarried(issued, 'email address');
    return toRequestResult(issued);
  },

  /** Proves the mailbox and hands back the one-shot grant the submit (and the phone step) spend. */
  async verifyEmail(input: unknown): Promise<{ token: string }> {
    const { email, code } = await validate(emailOtpVerifySchema, input);
    const challenge = await otpService.verifyLatest('VENUE_KIT_EMAIL', { email }, code);
    return { token: await otpService.grant(challenge) };
  },

  async requestPhone(input: unknown, requestedBy: string | null): Promise<VenueKitOtpRequest> {
    const { email_token, phone_extension, phone_number } = await validate(phoneOtpRequestSchema, input);
    const emailProof = await otpService.redeemGrant(email_token, 'VENUE_KIT_EMAIL');
    await assertPhoneBudget(emailProof.email, phone_number);
    const issued = await otpService.request({
      purpose: 'VENUE_KIT_PHONE',
      mediums: ['SMS'],
      phone_extension,
      phone_number,
      recipient_name: emailProof.recipient_name,
      context: { email: emailProof.email },
      requested_by: requestedBy,
    });
    assertCarried(issued, 'mobile number');
    return toRequestResult(issued);
  },

  async verifyPhone(input: unknown): Promise<{ token: string }> {
    const { phone_extension, phone_number, code } = await validate(phoneOtpVerifySchema, input);
    const challenge = await otpService.verifyLatest('VENUE_KIT_PHONE', { phone_extension, phone_number }, code);
    return { token: await otpService.grant(challenge) };
  },

  /** The challenge behind a grant, still unspent — checked before anything is written. */
  redeem(token: string, purpose: 'VENUE_KIT_EMAIL' | 'VENUE_KIT_PHONE'): Promise<IOtpChallenge> {
    return otpService.redeemGrant(token, purpose);
  },

  /** Spends a redeemed proof; a second submit racing this one is told the code is used. */
  spend(challenge: IOtpChallenge): Promise<IOtpChallenge> {
    return otpService.consume(String(challenge._id), { purpose: challenge.purpose });
  },
};
