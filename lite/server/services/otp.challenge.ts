import { LiteOtpModel, type LiteOtpDoc, type OtpPurpose, type OtpVia } from '../models/otp.model';
import { badInput } from '../utils/errors';
import { OTP_6 } from '../utils/validate';

export const CODE_TTL_MINUTES = 10;
export const RESEND_AFTER_SECONDS = 45;
export const MAX_ATTEMPTS = 5;

/** The contact a code was sent to: exactly one of an email or an E.164 phone. */
export type Contact = { email: string } | { phone: string };

const liveFilter = (contact: Contact, purpose: OtpPurpose) => ({ ...contact, purpose, consumed_at: null });

/**
 * The life of one code, shared by every door (email, phone, Duncit, linking a
 * contact): one live code per contact and purpose, a resend window, a capped
 * number of guesses, and a single successful use.
 */
export const otpChallenge = {
  /** Refuse a second code inside the resend window. */
  async assertCanSend(contact: Contact, purpose: OtpPurpose): Promise<void> {
    const latest = await LiteOtpModel.findOne(liveFilter(contact, purpose)).sort({ created_at: -1 });
    if (!latest) return;
    const waitMs = RESEND_AFTER_SECONDS * 1000 - (Date.now() - latest.last_sent_at.getTime());
    if (waitMs > 0) throw badInput(`Please wait ${Math.ceil(waitMs / 1000)}s before asking for another code`);
  },

  async open(
    contact: Contact,
    purpose: OtpPurpose,
    fields: { via: OtpVia; code_hash?: string; req_id?: string; user_id?: unknown; ttlMinutes?: number },
  ): Promise<LiteOtpDoc> {
    const { ttlMinutes = CODE_TTL_MINUTES, ...rest } = fields;
    return LiteOtpModel.create({ ...contact, purpose, ...rest, expires_at: new Date(Date.now() + ttlMinutes * 60_000) });
  },

  /**
   * The live challenge for a code someone typed. The guess is counted
   * atomically, so parallel guesses cannot slip past MAX_ATTEMPTS.
   */
  async take(contact: Contact, purpose: OtpPurpose, rawCode: unknown): Promise<{ challenge: LiteOtpDoc; code: string }> {
    const code = typeof rawCode === 'string' ? rawCode.trim() : '';
    if (!OTP_6.test(code)) throw badInput('Enter the 6-digit code');
    const latest = await LiteOtpModel.findOne(liveFilter(contact, purpose)).sort({ created_at: -1 });
    if (!latest) throw badInput('Ask for a new code first');
    if (latest.expires_at.getTime() < Date.now()) throw badInput('That code has expired. Ask for a new one');
    const challenge = await LiteOtpModel.findOneAndUpdate({ _id: latest._id, attempts: { $lt: MAX_ATTEMPTS } }, { $inc: { attempts: 1 } }, { new: true });
    if (!challenge) throw badInput('Too many tries. Ask for a new code');
    return { challenge, code };
  },

  /** Spend a challenge once; a second, parallel use of the same code is refused. */
  async consume(challenge: LiteOtpDoc): Promise<void> {
    const res = await LiteOtpModel.updateOne({ _id: challenge._id, consumed_at: null }, { $set: { consumed_at: new Date() } });
    if (res.modifiedCount !== 1) throw badInput('That code was already used. Ask for a new one');
  },
};
