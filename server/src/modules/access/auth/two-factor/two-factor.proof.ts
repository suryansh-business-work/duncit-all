import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { SIX_DIGIT_CODE } from '@utils/regex';
import { base32Encode, matchTotpStep } from './two-factor.totp';

/**
 * Proving the second factor: an authenticator code, or one recovery code.
 *
 * The attempt limit is on the ACCOUNT, not on the challenge. Whoever is
 * guessing already holds the password, and a challenge costs them nothing but
 * another sign-in — a per-challenge limit would be a per-sign-in limit, which
 * is no limit. Five wrong codes lock the second step for fifteen minutes.
 */

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;
export const RECOVERY_CODE_COUNT = 10;

/** Every field a proof reads — all select:false. */
export const TWO_FACTOR_SECRETS =
  '+security.two_factor_secret +security.two_factor_pending_secret +security.two_factor_recovery_code_hashes';

/** The slice of an account the second factor reads — a user loaded with TWO_FACTOR_SECRETS. */
export interface TwoFactorAccount {
  _id: unknown;
  security?: {
    two_factor_enabled?: boolean | null;
    two_factor_secret?: string | null;
    two_factor_pending_secret?: string | null;
    two_factor_recovery_code_hashes?: readonly string[] | null;
    locked_until?: Date | null;
  } | null;
}

const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** Case, spaces and the dash are how a person copies a code, not part of it. */
const normalizeRecovery = (code: string) => code.replaceAll(/[\s-]/g, '').toUpperCase();

/** Ten fresh recovery codes, as shown ONCE (`ABCD-EFGH`), and the hashes that are stored. */
export function newRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = base32Encode(crypto.randomBytes(5));
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
  return { codes, hashes: codes.map((code) => sha(normalizeRecovery(code))) };
}

const tooMany = (until: Date) =>
  new GraphQLError(
    `Too many wrong codes. Try again after ${Math.ceil((until.getTime() - Date.now()) / 60_000)} minutes.`,
    { extensions: { code: 'TOO_MANY_REQUESTS' } }
  );

/** A wrong code: counted, and once the limit is reached, the lock. Always throws. */
async function recordFailure(userId: string): Promise<never> {
  const after = await UserModel.findOneAndUpdate(
    { _id: userId },
    { $inc: { 'security.failed_login_attempts': 1 } },
    { new: true }
  );
  const attempts = after?.security?.failed_login_attempts ?? MAX_ATTEMPTS;
  if (attempts >= MAX_ATTEMPTS) {
    const until = new Date(Date.now() + LOCK_MS);
    await UserModel.updateOne(
      { _id: userId },
      { $set: { 'security.locked_until': until, 'security.failed_login_attempts': 0 } }
    );
    logs.server.warn('two-factor', 'locked', { msg: 'second factor locked after wrong codes', user_id: userId });
    throw tooMany(until);
  }
  const left = MAX_ATTEMPTS - attempts;
  throw new GraphQLError(`Incorrect code — ${left} attempts left`, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

/** Spend an authenticator code: a step at or before the last one accepted is a replay. */
async function spendTotp(user: TwoFactorAccount, code: string): Promise<boolean> {
  const secret: string = user.security?.two_factor_secret ?? '';
  // An HMAC with an empty key still yields codes — no secret must mean no match.
  if (!secret) return false;
  const step = matchTotpStep(secret, code, Date.now());
  if (step === null) return false;
  // One conditional write, so two requests racing with the same code cannot both win.
  const res = await UserModel.updateOne(
    {
      _id: String(user._id),
      $or: [
        { 'security.two_factor_last_step': null },
        { 'security.two_factor_last_step': { $lt: step } },
      ],
    },
    { $set: { 'security.two_factor_last_step': step } }
  );
  return res.modifiedCount === 1;
}

/** Spend a recovery code — pulled in the same write that matches it, so it works once. */
async function spendRecoveryCode(user: TwoFactorAccount, code: string): Promise<boolean> {
  const hash = sha(normalizeRecovery(code));
  const res = await UserModel.updateOne(
    { _id: String(user._id), 'security.two_factor_recovery_code_hashes': hash },
    { $pull: { 'security.two_factor_recovery_code_hashes': hash } }
  );
  return res.modifiedCount === 1;
}

/**
 * Prove the second factor for `user` (loaded with TWO_FACTOR_SECRETS), or throw.
 *
 * Six digits is an authenticator code; anything else is read as a recovery
 * code. A success clears the wrong-code count.
 */
export async function proveSecondFactor(user: TwoFactorAccount, rawCode: string): Promise<void> {
  const lockedUntil: Date | null = user.security?.locked_until ?? null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) throw tooMany(lockedUntil);
  const code = String(rawCode ?? '').trim();
  const ok = SIX_DIGIT_CODE.test(code)
    ? await spendTotp(user, code)
    : await spendRecoveryCode(user, code);
  if (!ok) await recordFailure(String(user._id));
  await UserModel.updateOne(
    { _id: String(user._id) },
    { $set: { 'security.failed_login_attempts': 0, 'security.locked_until': null } }
  );
}
