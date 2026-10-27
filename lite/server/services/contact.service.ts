import type { LiteUserDoc } from '../models/user.model';
import { LiteUserModel } from '../models/user.model';
import { badInput } from '../utils/errors';
import { sha256 } from '../utils/ids';
import { normalizeEmail, normalizePhone } from '../utils/validate';
import { checkSmsCode, requirePhoneCarrier, sendEmailCode, sendSmsCode } from './auth.service';
import { otpChallenge, type Contact } from './otp.challenge';
import { userService } from './user.service';

export type ContactKind = 'EMAIL' | 'PHONE';

const TAKEN = { EMAIL: 'Another account already uses that email', PHONE: 'Another account already uses that phone number' } as const;

async function contactOf(kind: ContactKind, raw: string): Promise<Contact> {
  if (kind === 'EMAIL') return { email: normalizeEmail(raw) };
  const creds = await requirePhoneCarrier();
  return { phone: normalizePhone(raw, creds.default_country_code) };
}

async function assertFree(contact: Contact, user: LiteUserDoc): Promise<void> {
  const kind: ContactKind = 'email' in contact ? 'EMAIL' : 'PHONE';
  if (await LiteUserModel.exists({ ...contact, _id: { $ne: user._id } })) throw badInput(TAKEN[kind]);
}

/**
 * Adding (or changing) the email or phone on an account that is already
 * signed in. The new contact is proved by a code sent to it — never taken on
 * the person's word — and may not belong to anyone else.
 */
export const contactService = {
  async requestCode(user: LiteUserDoc, kind: ContactKind, raw: string) {
    const contact = await contactOf(kind, raw);
    const current = 'email' in contact ? user.email : user.phone;
    if (current && current === Object.values(contact)[0]) throw badInput('That is already on your account');
    await assertFree(contact, user);
    if ('phone' in contact) return sendSmsCode(contact.phone, 'LINK', user._id);
    await otpChallenge.assertCanSend(contact, 'LINK');
    return sendEmailCode(contact.email, 'LINK', user._id);
  },

  async verify(user: LiteUserDoc, kind: ContactKind, raw: string, rawCode: string) {
    const contact = await contactOf(kind, raw);
    const { challenge, code } = await otpChallenge.take(contact, 'LINK', rawCode);
    // A code asked for by one account cannot be spent by another.
    if (String(challenge.user_id) !== String(user._id)) throw badInput('Ask for a new code first');
    const right = challenge.via === 'SMS' ? await checkSmsCode(challenge.req_id, code) : challenge.code_hash === sha256(code);
    if (!right) throw badInput('That code is not right');
    await otpChallenge.consume(challenge);
    await assertFree(contact, user);
    user.set(contact);
    try {
      await user.save();
    } catch (error) {
      // Two accounts racing for the same contact: the unique index decides.
      if ((error as { code?: number }).code === 11000) throw badInput(TAKEN[kind]);
      throw error;
    }
    return userService.me(user);
  },
};
