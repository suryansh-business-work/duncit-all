/**
 * Proving the WhatsApp number a new account signs up with.
 *
 * The proof comes BEFORE the account, on purpose. It used to come after:
 * `register` handed back a working session and the code was asked for on the
 * next screen, which meant every way of leaving that screen — a skip link, a
 * reload, force-closing the app — left a usable account behind an unproven
 * number. Joining Duncit is one thing now, and the code is part of it: there is
 * no account to keep until the number answers, whichever door was used.
 *
 * The code itself is issued and checked by the shared `otpService` — this file
 * only knows what a verified number MEANS here. Between the two steps the proof
 * travels as a one-shot grant, exactly as password recovery carries its own
 * across the screen that spends it: the challenge id alone would be guessable.
 */
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { isAisensyConfigured } from '@modules/platform/aisensy/aisensy.gateway';
import type { IOtpChallenge, IOtpDelivery } from '@modules/platform/otp/otp.model';
import { anyDelivered, normalizePhone, otpService } from '@modules/platform/otp/otp.service';

const PURPOSE = 'WHATSAPP_SIGNUP' as const;

/**
 * The account already holding this number, if it is not the caller's own.
 *
 * A number identifies an account at three doors (password login by phone,
 * Continue with OTP, and recovery), and `accountFor` matches it in EITHER
 * field — so one number on two accounts leaves those doors picking between
 * them. Checked at both moments a number can arrive: before a code is sent,
 * and again before the account it belongs to is created.
 */
async function numberRegistered(extension: string, number: string) {
  return UserModel.findOne({
    $or: [
      { 'auth.phone.number': number, 'auth.phone.extension': extension },
      { 'communication.whatsapp.number': number, 'communication.whatsapp.extension': extension },
    ],
  }).lean();
}

function numberTakenError(): GraphQLError {
  return new GraphQLError(
    'This phone number is already registered. Please use a different number or login.',
    { extensions: { code: 'CONFLICT' } }
  );
}

/**
 * Refuse a code that AiSensy could not actually carry.
 *
 * `otpService` answers an undelivered code by handing the fixed development
 * code back to the caller, which the signup screen then prints. Everywhere else
 * that is a harmless convenience on an account that already exists. HERE it
 * would be the way in: a missing API key, an unapproved template or an AiSensy
 * outage would put the code on screen, and the WhatsApp gate would be off for
 * as long as the outage lasted — for every number, including ones nobody holds.
 *
 * So the rule is: a transport that IS configured and did not deliver is an
 * outage, and an outage must never become a bypass. A platform with no AiSensy
 * key at all is a different thing — nothing is wired yet, nobody is signing up
 * against it, and the echoed code is what makes a fresh install usable.
 */
async function assertDelivered(deliveries: readonly IOtpDelivery[], number: string) {
  if (anyDelivered(deliveries)) return;
  const reason = deliveries.find((d) => d.reason)?.reason ?? 'AiSensy did not accept the message';
  if (!(await isAisensyConfigured())) return;
  logs.server.error('auth-whatsapp', 'signup-otp-undelivered', {
    msg: 'AiSensy is configured but the signup code did not go out',
    reason,
    // The number, never the code.
    phone_number: number,
  });
  throw new GraphQLError(
    'We could not send your WhatsApp code right now. Please try again in a few minutes.',
    { extensions: { code: 'OTP_DELIVERY_FAILED' } }
  );
}

export const whatsappAuthService = {
  /**
   * Step one: send the code to a number nobody has signed up with yet.
   *
   * Public, because there is no account to authorise it — this is the step that
   * decides whether there ever will be one. What stops it being a way to text
   * strangers is the same three things every public code door leans on: the
   * resend cooldown the challenge itself keeps, the shipped "Sign-in and
   * one-time codes" rate-limit rule (its `request*Otp` glob already names this
   * mutation), and the refusals below.
   *
   * The email is checked here too although the code cannot prove it. It is the
   * other thing `register` refuses on, and finding out about it AFTER typing a
   * code is a dead end at the last step of signup rather than a correction on
   * the step that asked.
   */
  async requestSignupOtp(extension: string, number: string, email?: string | null) {
    /*
      Normalised first, because that is the shape the numbers are STORED in —
      comparing what was typed against what was saved would miss a match on
      spacing alone.
    */
    const target = normalizePhone(extension, number);
    if (await numberRegistered(target.phone_extension, target.phone_number)) {
      throw numberTakenError();
    }
    const mailbox = String(email ?? '').trim().toLowerCase();
    if (mailbox && (await UserModel.exists({ 'auth.email': mailbox }))) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    const result = await otpService.request({
      purpose: PURPOSE,
      // The medium is an argument, not a second code path. WhatsApp is the one
      // this door uses: the number being proved IS the WhatsApp number, and
      // AiSensy carries it over the approved Meta authentication template.
      mediums: ['WHATSAPP'],
      ...target,
      requested_by: null,
    });
    await assertDelivered(result.deliveries, target.phone_number);
    return {
      ok: true,
      // Kept as `dev_otp` because the signup screens already read that field.
      // Null on any platform with AiSensy wired: `assertDelivered` has already
      // refused the only case that would fill it in.
      dev_otp: result.test_code,
    };
  },

  /**
   * Step two: prove the code, and trade it for the token that creates the
   * account.
   *
   * Nothing is written here — there is nobody to write to yet. What comes back
   * is spent by `register` or `signupWithGoogle`, and only by them.
   */
  async verifySignupOtp(extension: string, number: string, otp: string) {
    const target = normalizePhone(extension, number);
    const challenge = await otpService.verifyLatest(PURPOSE, target, otp);
    return { ok: true, whatsapp_token: await otpService.grant(challenge) };
  },

  /**
   * Step three, called from inside the signup doors: trade the token back for
   * the challenge that earned it.
   *
   * The number is re-checked against the one the code actually went to. Without
   * that, a proof of a number somebody owns would open an account on any other
   * number they typed afterwards — the grant says "this destination answered",
   * and the destination is the whole point.
   */
  async redeemSignupProof(
    token: string,
    extension: string,
    number: string
  ): Promise<IOtpChallenge> {
    const target = normalizePhone(extension, number);
    const challenge = await otpService.redeemGrant(token, PURPOSE);
    if (challenge.phone_number !== target.phone_number) {
      throw new GraphQLError('That verification was for a different number — start again', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (await numberRegistered(target.phone_extension, target.phone_number)) {
      throw numberTakenError();
    }
    return challenge;
  },

  /** Spend the proof. Single use: one code opens one account. */
  async spendSignupProof(challenge: IOtpChallenge): Promise<void> {
    await otpService.consume(String(challenge._id), { purpose: PURPOSE });
  },
};
