import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { UserModel } from '@modules/access/user/user.model';
import { OTP_RESEND_COOLDOWN_SEC, OTP_TTL_MINUTES } from '@modules/platform/otp/otp.constants';
import type { OtpMedium } from '@modules/platform/otp/otp.model';
import {
  anyDelivered,
  normalizeEmail,
  normalizePhone,
  otpService,
  type OtpTarget,
} from '@modules/platform/otp/otp.service';
import { sendPasswordChangedEmail } from '@services/email/email.service';
import { sealSessions } from './session-seal';

/**
 * Recovering a forgotten password, on either channel the person chooses.
 *
 * THREE STEPS, and they are three on purpose: pick where the code goes, prove
 * the code, then set the password. The step in the middle used to be folded
 * into the last one — the old `resetPasswordWithOtp` took the code and the new
 * password together — so a person only found out their code was wrong after
 * typing a password twice.
 *
 * ONE code path for both channels. The medium is an argument to the shared
 * `otpService` (rule 41), so expiry, the attempt limit, the resend cooldown and
 * single use are the same rules whether the code arrived by email or over
 * WhatsApp. That is also why this does NOT reuse the older per-purpose
 * hash/expiry pair on the user document: that one has no attempt limit and no
 * cooldown, and giving it a second channel would have been a second set of
 * both.
 */

const PURPOSE = 'PASSWORD_RESET' as const;

/** Where a person can ask for their reset code. */
export const PASSWORD_RESET_CHANNELS = ['EMAIL', 'PHONE'] as const;
export type PasswordResetChannel = (typeof PASSWORD_RESET_CHANNELS)[number];

/**
 * The medium each channel sends over.
 *
 * PHONE means WhatsApp and only WhatsApp: SMS has no provider on this platform,
 * so asking for both would fan a code out to a medium that cannot carry it and
 * report the whole request as stubbed.
 */
export const CHANNEL_MEDIUMS: Record<PasswordResetChannel, OtpMedium[]> = {
  EMAIL: ['EMAIL'],
  PHONE: ['WHATSAPP'],
};

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

export interface PasswordResetLookup {
  channel: PasswordResetChannel;
  email?: string | null;
  phone_extension?: string | null;
  phone_number?: string | null;
}

/** The destination, validated for the channel that was actually chosen. */
export function targetOf(input: Readonly<PasswordResetLookup>): OtpTarget {
  if (input.channel === 'EMAIL') return { email: normalizeEmail(input.email) };
  return normalizePhone(input.phone_extension, input.phone_number);
}

/**
 * The account behind a destination, or null.
 *
 * A phone is matched on the NUMBER alone, across both the number the account
 * signed up with and the WhatsApp number it later added — the same pair
 * `allowedPhoneMediums` reads and a campaign is addressed to. Somebody who gave
 * us a WhatsApp number must be able to recover on it.
 */
export function accountFor(target: Readonly<OtpTarget>) {
  const filter = target.email
    ? { 'auth.email': target.email }
    : {
        $or: [
          { 'auth.phone.number': target.phone_number },
          { 'communication.whatsapp.number': target.phone_number },
        ],
      };
  return UserModel.findOne(filter).select('+auth.password');
}

/** What the client is told about a request. */
export interface PasswordResetRequestResult {
  ok: boolean;
  /**
   * False when there is nothing here to recover — no account, or one that signs
   * in with Google and has no password. No code is sent, and the screen says so
   * rather than pretending one is on its way: a person staring at an empty inbox
   * learns nothing, and whoever typed the address already had it.
   */
  registered: boolean;
  channel: PasswordResetChannel;
  expires_at: string | null;
  resend_after_seconds: number;
  /** Minutes the code lasts, so no screen has to hard-code the rule. */
  expires_in_minutes: number;
  /**
   * Whether a medium actually carried the code.
   *
   * `registered` says an account was found; this says the code left the
   * building. They are different answers and the screen needs both: a mailbox
   * that has opted out of email codes, a switched-off template and a mail
   * server that refused the address are all a found account whose code nobody
   * will ever receive, and telling that person to "check your email" is the one
   * thing that leaves them with nowhere to go.
   */
  sent: boolean;
  /** Echoed back ONLY while no medium could really carry the code. */
  test_code: string | null;
}

export const notRegistered = (channel: PasswordResetChannel): PasswordResetRequestResult => ({
  ok: false,
  registered: false,
  channel,
  expires_at: null,
  resend_after_seconds: OTP_RESEND_COOLDOWN_SEC,
  expires_in_minutes: OTP_TTL_MINUTES,
  // Nothing was asked for, so nothing went out.
  sent: false,
  test_code: null,
});

export const passwordResetService = {
  /** Step one: find the account and send it a code on the chosen channel. */
  async request(input: Readonly<PasswordResetLookup>): Promise<PasswordResetRequestResult> {
    const target = targetOf(input);
    const user = await accountFor(target);
    /*
      Three refusals, one answer. No account; an account that signs in with
      Google and has no password to reset; and an account sealed because its
      owner asked to be deleted all read as "we could not find an account with
      these details" — resetting the password of an account on its way out opens
      nothing, since every door already refuses it.
    */
    if (!user?.auth?.password || isAccountLocked(String(user._id))) {
      return notRegistered(input.channel);
    }

    const issued = await otpService.request({
      purpose: PURPOSE,
      mediums: CHANNEL_MEDIUMS[input.channel],
      ...target,
      recipient_name: user.profile?.first_name ?? '',
      /*
        What the last step reads the account off. The code proves the
        DESTINATION; this is what says whose account that destination is,
        resolved once, here, rather than looked up again from a value the caller
        could change between two steps.
      */
      context: { user_id: String(user._id) },
      requested_by: String(user._id),
    });

    return {
      ok: true,
      registered: true,
      channel: input.channel,
      expires_at: issued.expires_at,
      resend_after_seconds: issued.resend_after_seconds,
      expires_in_minutes: OTP_TTL_MINUTES,
      sent: anyDelivered(issued.deliveries),
      test_code: issued.test_code,
    };
  },

  /** Step two: prove the code, and trade it for a one-shot grant. */
  async verify(
    input: Readonly<PasswordResetLookup & { otp: string }>
  ): Promise<{ ok: boolean; reset_token: string }> {
    const challenge = await otpService.verifyLatest(PURPOSE, targetOf(input), input.otp);
    return { ok: true, reset_token: await otpService.grant(challenge) };
  },

  /** Step three: spend the grant and set the new password. */
  async complete(input: Readonly<{ reset_token: string; new_password: string }>): Promise<boolean> {
    const challenge = await otpService.redeemGrant(input.reset_token, PURPOSE);
    const userId = String((challenge.context as { user_id?: string })?.user_id ?? '');
    const user = await UserModel.findById(userId).select('+auth.password');
    if (!user?.auth?.password || isAccountLocked(userId)) {
      throw badInput('That verification has expired — start again');
    }

    /*
      A password the account already holds is refused.

      Reliably checkable, because the stored hash is right here and bcrypt can
      answer it — so the flow says so rather than reporting a success that
      changed nothing. Checked BEFORE the code is spent, so somebody who types
      their old password by accident still has their verification.
    */
    if (await bcrypt.compare(input.new_password, user.auth.password)) {
      throw badInput('Choose a password you have not used on this account before');
    }

    // Spent first: single use is what stops one proof setting two passwords,
    // and it has to be true before anything is written.
    await otpService.consume(String(challenge._id), { purpose: PURPOSE });

    const now = new Date();
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.password': await bcrypt.hash(input.new_password, 10),
          'security.password_changed_at': now,
          /*
            Every token minted before this instant stops being accepted. The
            premise of the whole flow is that somebody else may hold the old
            credentials, so a browser they left signed in has to close.
          */
          'security.sessions_invalidated_at': now,
        },
      }
    );
    // Applied to this process immediately; the boot load and the refresh in
    // `session-seal` cover every other replica.
    sealSessions(userId, now);
    logs.server.info('auth', 'password-reset', { user_id: userId, mediums: challenge.mediums });

    await sendPasswordChangedEmail(user.auth.email ?? '', user.profile?.first_name ?? '');
    return true;
  },
};
