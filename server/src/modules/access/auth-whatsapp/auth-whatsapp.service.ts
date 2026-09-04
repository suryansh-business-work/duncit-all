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
import { UserModel } from '@modules/access/user/user.model';
import type { IOtpChallenge } from '@modules/platform/otp/otp.model';
import { normalizePhone, otpService } from '@modules/platform/otp/otp.service';

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
      // The medium is an argument, not a second code path.
      mediums: ['WHATSAPP'],
      ...target,
      requested_by: null,
    });
    return {
      ok: true,
      // Kept as `dev_otp` because the signup screens already read that field.
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
