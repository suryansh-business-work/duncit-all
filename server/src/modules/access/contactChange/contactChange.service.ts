import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import {
  EMAIL_OTP_MINUTES,
  devOtpEcho,
  emailOtpCode,
  emailOtpExpiry,
  hashOtp,
} from '@modules/access/user/email-otp';
import { normalizePhone, otpService } from '@modules/platform/otp/otp.service';
import type { OtpPurpose } from '@modules/platform/otp/otp.model';
import { sendEmailVerificationOtpEmail } from '@services/email/email.service';

/** Which number on the account is moving. */
export type ContactPhoneField = 'PHONE' | 'WHATSAPP';

/** Everything that differs between the two numbers, in one place. */
const PHONE_FIELDS: Record<
  ContactPhoneField,
  { purpose: OtpPurpose; numberPath: string; extensionPath: string }
> = {
  PHONE: {
    purpose: 'PHONE_CHANGE',
    numberPath: 'auth.phone.number',
    extensionPath: 'auth.phone.extension',
  },
  WHATSAPP: {
    purpose: 'WHATSAPP_CHANGE',
    numberPath: 'communication.whatsapp.number',
    extensionPath: 'communication.whatsapp.extension',
  },
};

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const conflict = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'CONFLICT' } });

/** The mediums a code for a phone-number change may travel on. */
const PHONE_CHANGE_MEDIUMS = ['SMS', 'WHATSAPP'] as const;

/**
 * Seconds between two email-change codes on one account.
 *
 * This mutation takes a session and sends mail to an address the CALLER names,
 * so without a cooldown one signed-in account is a way to fill somebody else's
 * inbox with Duncit mail. The phone side needs no equivalent: `otpService`
 * already enforces its own resend cooldown per challenge.
 */
const EMAIL_RESEND_COOLDOWN_SEC = 60;

const loadUser = async (user_id: string) => {
  const user = await UserModel.findById(user_id);
  if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  return user;
};

/**
 * Refuse a contact number that already signs another account in.
 *
 * Only the CONTACT number carries this rule: `auth.phone` is a credential and
 * its unique index would refuse the write anyway, so saying so plainly beats
 * an E11000. Two people may legitimately share one WhatsApp number — a couple,
 * a family handset — and it opens no session, so it is not checked.
 */
async function assertPhoneFree(user_id: string, extension: string, number: string) {
  const taken = await UserModel.exists({
    _id: { $ne: new Types.ObjectId(user_id) },
    'auth.phone.number': number,
    'auth.phone.extension': extension,
  });
  if (taken) {
    throw conflict('That phone number is already registered to another account');
  }
}

/**
 * Throw unless the cooldown since this account's last email code has passed.
 *
 * Read off the live code's expiry rather than a separate timestamp: a code is
 * issued with a known TTL, so how long is left on it says exactly how long ago
 * it was sent, and there is no second field to keep in step.
 */
async function assertEmailResendAllowed(user_id: string) {
  const live = await UserModel.findById(user_id)
    .select('+auth.email_change_otp_expires_at')
    .lean();
  const expiresAt = (live as any)?.auth?.email_change_otp_expires_at as Date | undefined;
  if (!expiresAt) return;
  const sentAgoMs = EMAIL_OTP_MINUTES * 60_000 - (expiresAt.getTime() - Date.now());
  const waitMs = EMAIL_RESEND_COOLDOWN_SEC * 1000 - sentAgoMs;
  if (waitMs > 0) {
    throw new GraphQLError(
      `Wait ${Math.ceil(waitMs / 1000)}s before asking for another code`,
      { extensions: { code: 'TOO_MANY_REQUESTS' } }
    );
  }
}

/**
 * Changing the address or numbers Duncit reaches somebody on.
 *
 * Every change here is proved by a one-time code sent to the NEW value. That
 * direction is the whole point: a code sent to the address being replaced only
 * shows the person still holds the old one, which they are about to give up
 * anyway, and says nothing about whether the new one is theirs or a typo.
 *
 * The codes themselves are not implemented here. Phone codes are issued and
 * checked by the shared `otpService`, which owns expiry, the attempt limit and
 * single use; email codes use the same hash and window as every other emailed
 * code on the user document. This file only knows what a verified value MEANS
 * — which field it lands in, and what else stops being true once it moves.
 */
export const contactChangeService = {
  /** Send a code to the number this account wants to start using. */
  async requestPhoneOtp(
    user_id: string,
    field: ContactPhoneField,
    extension: string,
    number: string
  ) {
    const spec = PHONE_FIELDS[field];
    const phone = normalizePhone(extension, number);
    const user = await loadUser(user_id);
    if (field === 'PHONE') {
      await assertPhoneFree(user_id, phone.phone_extension, phone.phone_number);
    }
    return otpService.request({
      purpose: spec.purpose,
      // The medium is an argument, never a second code path (rule 41). Both are
      // offered because the number being proved is new: whichever of the two
      // actually reaches the handset is the one that works.
      mediums: PHONE_CHANGE_MEDIUMS,
      phone_extension: phone.phone_extension,
      phone_number: phone.phone_number,
      recipient_name: user.profile?.first_name ?? '',
      context: { field, user_id },
      requested_by: user_id,
    });
  },

  /** Spend the code and store the number it proved. */
  async confirmPhoneChange(
    user_id: string,
    field: ContactPhoneField,
    extension: string,
    number: string,
    otp: string
  ) {
    const spec = PHONE_FIELDS[field];
    const phone = normalizePhone(extension, number);
    if (field === 'PHONE') {
      await assertPhoneFree(user_id, phone.phone_extension, phone.phone_number);
    }
    const challenge = await otpService.verifyLatest(
      spec.purpose,
      phone.phone_extension,
      phone.phone_number,
      otp
    );
    // Bound to the account that asked. Without this, one person's verified code
    // for a number could be replayed by another session to claim that number.
    await otpService.consume(String(challenge._id), {
      purpose: spec.purpose,
      match: (c) => String((c.context as any)?.user_id ?? '') === String(user_id),
    });

    const set: Record<string, unknown> = {
      [spec.numberPath]: phone.phone_number,
      [spec.extensionPath]: phone.phone_extension,
    };
    // The code that just landed proved this number, so it is stored verified.
    if (field === 'PHONE') set['auth.phone.is_verified'] = true;
    else set['communication.whatsapp.verified_at'] = new Date();

    const before = await UserModel.findById(user_id).lean();
    const after = await UserModel.findByIdAndUpdate(user_id, { $set: set }, { new: true }).catch(
      (e: any) => {
        // The unique phone index is the final authority, and it can still fire
        // between the check above and this write.
        if (e?.code === 11000) {
          throw conflict('That phone number is already registered to another account');
        }
        throw e;
      }
    );
    if (!after) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    await userAuditService.record({ userId: user_id, before, after });
    return after;
  },

  /** Email a code to the address this account wants to start using. */
  async requestEmailOtp(user_id: string, email: string) {
    const next = String(email ?? '').trim().toLowerCase();
    if (!next) throw badInput('Enter the new email address');
    const user = await loadUser(user_id);
    if (next === String(user.auth?.email ?? '').toLowerCase()) {
      throw badInput('That is already your email address');
    }
    const taken = await UserModel.exists({
      _id: { $ne: new Types.ObjectId(user_id) },
      'auth.email': next,
    });
    if (taken) throw conflict('That email address is already in use');
    await assertEmailResendAllowed(user_id);

    const otp = emailOtpCode();
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.email_change_otp_hash': hashOtp(otp),
          'auth.email_change_otp_expires_at': emailOtpExpiry(),
          // The address is pinned to the code. Without it, a code sent to one
          // address could be typed in alongside a different one and move the
          // account somewhere nothing was ever sent.
          'auth.email_change_pending': next,
        },
      }
    );
    // Sent to the NEW address, which is the only thing this code can prove.
    await sendEmailVerificationOtpEmail({
      to: next,
      name: user.profile?.first_name || 'there',
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: devOtpEcho(otp) };
  },

  /** Spend the emailed code and store the address it proved. */
  async confirmEmailChange(user_id: string, email: string, otp: string) {
    const next = String(email ?? '').trim().toLowerCase();
    const code = String(otp ?? '').trim();
    const user = await UserModel.findById(user_id).select(
      '+auth.email_change_otp_hash +auth.email_change_otp_expires_at +auth.email_change_pending'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const auth = (user as any).auth ?? {};
    const expiresAt = auth.email_change_otp_expires_at as Date | undefined;
    const storedHash = auth.email_change_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw badInput('OTP expired. Request a new OTP.');
    }
    if (String(auth.email_change_pending ?? '') !== next) {
      throw badInput('That code was sent to a different address');
    }
    if (hashOtp(code) !== storedHash) throw badInput('Invalid OTP');

    // Re-checked after the code, not only before it: the address may have been
    // claimed by somebody else during the ten minutes the code was in flight.
    const taken = await UserModel.exists({
      _id: { $ne: user._id },
      'auth.email': next,
    });
    if (taken) throw conflict('That email address is already in use');

    const before = await UserModel.findById(user_id).lean();
    const after = await UserModel.findByIdAndUpdate(
      user_id,
      {
        // Verified, because the code went to this address and came back.
        $set: { 'auth.email': next, 'auth.is_email_verified': true },
        $unset: {
          'auth.email_change_otp_hash': '',
          'auth.email_change_otp_expires_at': '',
          'auth.email_change_pending': '',
        },
      },
      { new: true }
    ).catch((e: any) => {
      if (e?.code === 11000) throw conflict('That email address is already in use');
      throw e;
    });
    if (!after) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    await userAuditService.record({ userId: user_id, before, after });
    return after;
  },
};
