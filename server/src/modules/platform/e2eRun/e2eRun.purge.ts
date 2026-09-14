import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { UserModel } from '@modules/access/user/user.model';
import { UserChangeLogModel } from '@modules/access/userAudit/userAudit.model';
import { userTrace } from '@modules/access/accountDeletion/accountDeletion.trace';
import { purgeReference } from '@modules/access/accountDeletion/accountDeletion.purge';
import { mediaLibraryService } from '@modules/platform/upload/mediaLibrary.service';
import { OtpChallengeModel } from '@modules/platform/otp/otp.model';
import { e2eOverrides } from './e2eRun.mute';
import { forgetRunAccountCodes } from './e2eRun.codes';

/**
 * Removing the run account.
 *
 * A run lives one account's whole life — signup to deletion — once per
 * surface, with the same address and the same phone every time. Filing a
 * deletion only seals an account for its retention window, so the next
 * surface's signup would find the address and the number still taken. This
 * sweep removes the account outright, with everything that points at it (the
 * same schema-driven trace the account-deletion console walks), and forgets
 * its one-time codes so the next signup is not held back by a resend cooldown.
 * The suite calls it after each surface, and the CI leg once more at the end
 * whether the suite passed or failed.
 *
 * Refused unless this server has "one-time codes for the run account" on: that
 * switch is what declares a database an e2e target, and it must never be on
 * for production. A purge that could run against production would be a
 * delete-by-email for anyone with the token.
 */

const STAMP_RE = /^\d{12}$/;

const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export interface PurgeE2eRunDataInput {
  stamp: string;
  signup_email: string;
  /** Ignored: the run account is `signup_email`. */
  login_email?: string | null;
}

interface PurgedCollection {
  collection: string;
  deleted: number;
}

const clean = (value: unknown): string => String(value ?? '').trim();

/**
 * The run account and any address a scenario derived from it by suffixing the
 * local part (`riya+0709…-new@…`). Anchored at both ends and escaped, so `+` in
 * a Gmail address is a plus.
 */
function stampedAccountsFilter(email: string, stamp: string): RegExp {
  const at = email.lastIndexOf('@');
  if (at <= 0) throw badInput('signup_email must be an email address.');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local.includes(stamp)) {
    throw badInput('The address does not carry the run stamp, so it is not this run’s account.');
  }
  return new RegExp(`^${escapeRe(local)}(?:-[a-z0-9-]{1,40})?@${escapeRe(domain)}$`, 'i');
}

/** One account and everything that points at it, in one transaction. */
async function purgeAccount(userId: string): Promise<void> {
  const trace = await userTrace(userId);
  await withTransaction(async (session) => {
    for (const group of trace) {
      await purgeReference(group, userId, session);
    }
    // A real member's change log is retained and redacted; an account that
    // only ever existed for a test run has no audit trail worth keeping.
    await UserChangeLogModel.deleteMany({ user_id: new Types.ObjectId(userId) }, { session });
    await UserModel.deleteOne({ _id: userId }, { session });
  });
}

/**
 * One-time-code challenges for the run's addresses and its phone. A consumed
 * signup code is harmless, but a live sign-in or reset challenge would make the
 * next surface's first request wait out a resend cooldown.
 */
async function purgeChallenges(accounts: RegExp, phone: string): Promise<PurgedCollection> {
  const or: Record<string, unknown>[] = [{ email: accounts }];
  if (phone) or.push({ phone_number: phone });
  const res = await OtpChallengeModel.deleteMany({ $or: or });
  return { collection: OtpChallengeModel.collection.name, deleted: res.deletedCount ?? 0 };
}

/**
 * Uploads a scenario named `e2e-<stamp>…` for exactly this lookup. Best-effort:
 * an ImageKit that is not configured, or not reachable, must not fail the purge
 * of everything else, so it reports zero and says why in the log.
 */
async function purgeStampedUploads(stamp: string): Promise<PurgedCollection> {
  const collection = 'imagekit:/pods';
  try {
    const files = await mediaLibraryService.list({ search: `e2e-${stamp}`, path: '/pods', limit: 100 });
    const deleted = await mediaLibraryService.remove(
      files.map((file) => file.fileId),
      { id: 'e2e-purge' }
    );
    return { collection, deleted };
  } catch (error) {
    logs.server.warn('e2eRun', 'purgeStampedUploads', { error, stamp });
    return { collection, deleted: 0 };
  }
}

export async function purgeE2eRunData(input: PurgeE2eRunDataInput) {
  const stamp = clean(input?.stamp);
  if (!STAMP_RE.test(stamp)) throw badInput('stamp must be the run’s ddMMyyyyHHmm identity stamp.');
  const email = clean(input?.signup_email).toLowerCase();
  if (!email) throw badInput('The run account address is required.');

  const { otpBypass, account } = await e2eOverrides();
  if (!otpBypass) {
    throw new GraphQLError(
      'This server is not an e2e target: "One-time codes for the run account" is off in Tech > E2E Tests > Settings, so no suite could have created anything here and nothing will be purged.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }

  const addresses = stampedAccountsFilter(email, stamp);
  const accounts = await UserModel.find({ 'auth.email': addresses }, { _id: 1 }).lean();
  for (const found of accounts) {
    await purgeAccount(String(found._id));
  }

  const phone = account?.phone ?? '';
  const records: PurgedCollection[] = [
    await purgeChallenges(addresses, phone),
    { collection: 'e2e one-time codes', deleted: await forgetRunAccountCodes(email, phone) },
    await purgeStampedUploads(stamp),
  ];

  logs.server.info('e2eRun', 'purge', { stamp, accounts: accounts.length, records });
  return { accounts_deleted: accounts.length, records };
}
