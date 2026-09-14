import { GraphQLError } from 'graphql';
import { Schema, model, type Document } from 'mongoose';
import { logs } from '@observability/log';
import { e2eOverrides } from './e2eRun.mute';

/**
 * One-time codes for the e2e run account, held instead of sent.
 *
 * A live suite has to type the code a real member would receive, and it cannot
 * read WhatsApp or a mailbox. So while "one-time codes for the run account" is
 * on, every code ADDRESSED TO A RUN ACCOUNT is recorded here at the moment it is
 * issued and not delivered — and every screen still says it was sent, because
 * the suite is testing the production screens. Any other address gets the
 * normal delivery; nothing here reveals a code for somebody else's account.
 *
 * Codes are issued in two places, and both call `holdRunAccountCode`:
 *  - `otpService.request` — signup WhatsApp, sign-in code, forgot password,
 *    WhatsApp number change;
 *  - `sendEmail` — the codes still kept on the user document: email change,
 *    password change, account deletion and portal sign-in.
 */

export const E2E_HELD_REASON = 'Held for the E2E run account (Tech > E2E Tests > Settings)';

/** The emailed codes, by template, named the way a suite asks for them. */
const TEMPLATE_PURPOSES: Readonly<Record<string, string>> = {
  'login-otp': 'LOGIN',
  'password-reset-otp': 'PASSWORD_RESET',
  'email-verification-otp': 'EMAIL_VERIFICATION',
  'password-change-otp': 'PASSWORD_CHANGE',
  'account-deletion-otp': 'ACCOUNT_DELETION',
  'portal-login-otp': 'PORTAL_LOGIN',
};

/** Long enough for every code's own expiry (10 minutes); Mongo removes it after. */
const KEEP_MS = 15 * 60 * 1000;

interface IE2eOneTimeCode extends Document {
  purpose: string;
  email: string;
  phone_number: string;
  code: string;
  expires_at: Date;
  created_at: Date;
}

const e2eOneTimeCodeSchema = new Schema<IE2eOneTimeCode>(
  {
    purpose: { type: String, required: true },
    email: { type: String, default: '' },
    phone_number: { type: String, default: '' },
    code: { type: String, required: true },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
e2eOneTimeCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
e2eOneTimeCodeSchema.index({ purpose: 1, email: 1, phone_number: 1, created_at: -1 });

export const E2eOneTimeCodeModel = model<IE2eOneTimeCode>('E2eOneTimeCode', e2eOneTimeCodeSchema);

export interface RunAccountTarget {
  email?: string | null;
  phone_number?: string | null;
}

const normEmail = (value: string | null | undefined): string => String(value ?? '').trim().toLowerCase();
const normPhone = (value: string | null | undefined): string => String(value ?? '').replaceAll(/\D/g, '');

/** True when codes for this address or number are held for the suite right now. */
async function isHeldTarget(target: Readonly<RunAccountTarget>): Promise<boolean> {
  const { otpBypass, account } = await e2eOverrides();
  if (!otpBypass || !account) return false;
  const email = normEmail(target.email);
  if (email) return account.email.test(email);
  const phone = normPhone(target.phone_number);
  return Boolean(phone) && phone === account.phone;
}

/**
 * Record a code for the run account, and say whether it was held.
 *
 * `true` means the caller must NOT deliver it: the suite reads it from here.
 * Pass either `purpose` (the one-time code service's own) or the email
 * `template` that carries the code.
 */
export async function holdRunAccountCode(input: {
  purpose?: string;
  template?: string;
  email?: string | null;
  phone_number?: string | null;
  code: string | null | undefined;
}): Promise<boolean> {
  const purpose = input.purpose ?? TEMPLATE_PURPOSES[input.template ?? ''];
  const code = String(input.code ?? '');
  if (!purpose || !code) return false;
  if (!(await isHeldTarget(input))) return false;
  await E2eOneTimeCodeModel.create({
    purpose,
    email: normEmail(input.email),
    phone_number: normPhone(input.phone_number),
    code,
    expires_at: new Date(Date.now() + KEEP_MS),
  });
  logs.server.info('e2eRun', 'code-held', { purpose });
  return true;
}

/**
 * The newest held code for a purpose and a run account, or null when none has
 * been issued yet — a suite asks again rather than failing on the first miss.
 */
export async function latestRunAccountCode(input: { purpose: string; email?: string | null; phone?: string | null }) {
  if (!(await e2eOverrides()).otpBypass) {
    throw new GraphQLError(
      'One-time codes for the run account are off in Tech > E2E Tests > Settings on this server.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }
  const target = { email: input.email, phone_number: input.phone };
  if (!(await isHeldTarget(target))) {
    throw new GraphQLError('That address or number is not an e2e run account.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const email = normEmail(input.email);
  const doc = await E2eOneTimeCodeModel.findOne({
    purpose: String(input.purpose ?? ''),
    ...(email ? { email } : { phone_number: normPhone(input.phone) }),
    expires_at: { $gt: new Date() },
  })
    .sort({ created_at: -1 })
    .lean();
  if (!doc) return null;
  return {
    code: doc.code,
    purpose: doc.purpose,
    issued_at: doc.created_at.toISOString(),
    expires_at: doc.expires_at.toISOString(),
  };
}

/** Forget every held code for an address and a number — part of the purge. */
export async function forgetRunAccountCodes(email: string, phone: string): Promise<number> {
  const or: Record<string, string>[] = [{ email: normEmail(email) }];
  const digits = normPhone(phone);
  if (digits) or.push({ phone_number: digits });
  const res = await E2eOneTimeCodeModel.deleteMany({ $or: or });
  return res.deletedCount ?? 0;
}
