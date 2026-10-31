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
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ShortLinkModel } from '@modules/crm/marketing/shortLink.model';
import { maskEmail } from '@modules/platform/envEntry/envAccess.service';
import { e2eOverrides } from './e2eRun.mute';
import { forgetRunAccountCodes } from './e2eRun.codes';
import { stampTime } from './e2eRun.identity';

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
  /**
   * The run phone, as the runner was handed it. Preferred over this server's
   * own E2E settings, which describe no identity at all on a server that a run
   * only drives (its identity comes from the server it REPORTS to).
   */
  phone?: string | null;
}

interface PurgedCollection {
  collection: string;
  deleted: number;
}

const clean = (value: unknown): string => (typeof value === 'string' ? value : '').trim();

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

/**
 * Every run's address, from THIS run's: its stamp swapped for any stamp
 * (`admin+301020262320@…` → `admin+<12 digits>@…`, `-suffix` allowed). Built
 * from the address the runner was handed, never from this server's own E2E
 * settings, for the same reason the phone is passed in. Only called after
 * stampedAccountsFilter has proved the address carries the stamp.
 */
function anyRunAddress(email: string, stamp: string): RegExp {
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const cut = local.indexOf(stamp);
  const before = escapeRe(local.slice(0, cut));
  const after = escapeRe(local.slice(cut + stamp.length));
  return new RegExp(String.raw`^${before}\d{12}${after}(?:-[a-z0-9-]{1,40})?@${escapeRe(email.slice(at + 1))}$`, 'i');
}

/**
 * How old an earlier run must be before its account is taken off the run
 * phone: longer than the slowest whole run, so a run still going on the other
 * branch (main and staging do not share a concurrency group, and both drive
 * staging) is never pulled out from under itself.
 */
const EARLIER_RUN_MS = 6 * 60 * 60 * 1000;

/** The stamp inside a run address: `admin+301020262320-new@…` → `301020262320`. */
const STAMP_IN_ADDRESS = /(\d{12})(?:-[a-z0-9-]{1,40})?@/i;

interface PhoneHolders {
  /** Earlier runs' accounts still on the run phone — removed with this run's. */
  stale: Types.ObjectId[];
  /** A masked address on the run phone that is not an earlier run's account; null when there is none. */
  heldBy: string | null;
}

/**
 * Who else holds the run phone.
 *
 * Every run signs up with a fresh, stamped address but the SAME phone, and the
 * stamped sweep only reaches this run. A run that never got to its own purge
 * (cancelled, killed, or from before the purge existed) leaves an account on
 * the number, and every later signup is refused "This phone number is already
 * registered" — the whole live suite then dies in its setup hooks. An earlier
 * RUN account (a run address, stamped long enough ago) goes with this purge.
 * Anything else on the number — a real member, or a run still going — is never
 * touched, only named, masked, so the operator can move the run to another
 * phone. Both fields a number can live in are read, as signup reads them.
 */
async function runPhoneHolders(runAddress: RegExp, phone: string, stamp: string, now: number): Promise<PhoneHolders> {
  if (!phone) return { stale: [], heldBy: null };
  const holders = await UserModel.find(
    { $or: [{ 'auth.phone.number': phone }, { 'communication.whatsapp.number': phone }] },
    { 'auth.email': 1 }
  ).lean();
  const stale: Types.ObjectId[] = [];
  let heldBy: string | null = null;
  for (const holder of holders) {
    const email = holder.auth?.email ?? '';
    const runStamp = runAddress.test(email) ? STAMP_IN_ADDRESS.exec(email)?.[1] : undefined;
    // This run's own account is the stamped sweep's to remove.
    if (runStamp === stamp) continue;
    const startedAt = runStamp ? stampTime(runStamp) : null;
    if (startedAt && now - startedAt.getTime() > EARLIER_RUN_MS) stale.push(holder._id);
    else heldBy ??= maskEmail(email);
  }
  return { stale, heldBy };
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
  return { collection: OtpChallengeModel.collection.name, deleted: res.deletedCount };
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

/**
 * What the run account builds as a partner (the live suite's fixture world:
 * specs/api/fixtures) that the account trace cannot take with it.
 *
 * The trace deletes what the account OWNS through a scalar reference — its
 * venue, host profile, slots, Pod Requests and food coupons — but only pulls it
 * out of an array. A pod it hosted would stay behind with no host at a venue
 * that no longer exists, and so would the club it administers; a share link
 * names its maker in a field the trace does not read. So, BEFORE the accounts
 * go (while a pod can still be found by its host):
 *   - pods hosted by the run's accounts and nobody else, cancelled ones too,
 *     with their memberships and audit rows — a pod co-hosted by anyone else
 *     is left to the trace, which only takes the run account off it;
 *   - share links the run's accounts minted;
 *   - clubs named with this run's marker (`[E2E <stamp> …]`).
 */
async function purgeRunFixtures(userIds: Types.ObjectId[], stamp: string): Promise<PurgedCollection[]> {
  const runIds = new Set(userIds.map(String));
  const hosted = await PodModel.find({ pod_hosts_id: { $in: userIds } }, { pod_hosts_id: 1 })
    .setOptions({ includeDeleted: true })
    .lean();
  const podIds = hosted
    .filter((pod) => pod.pod_hosts_id.every((hostId) => runIds.has(String(hostId))))
    .map((pod) => pod._id);
  const members = await PodMemberModel.deleteMany({ pod_id: { $in: podIds } });
  const audits = await PodAuditLogModel.deleteMany({ pod_id: { $in: podIds } });
  const pods = await PodModel.deleteMany({ _id: { $in: podIds } });
  const links = await ShortLinkModel.deleteMany({ created_by: { $in: [...runIds] } });
  const marked = new RegExp(`^${escapeRe(`[E2E ${stamp} `)}`);
  const clubs = await ClubModel.deleteMany({ club_name: marked });
  return [
    { collection: PodMemberModel.collection.name, deleted: members.deletedCount ?? 0 },
    { collection: PodAuditLogModel.collection.name, deleted: audits.deletedCount ?? 0 },
    { collection: PodModel.collection.name, deleted: pods.deletedCount ?? 0 },
    { collection: ShortLinkModel.collection.name, deleted: links.deletedCount ?? 0 },
    { collection: ClubModel.collection.name, deleted: clubs.deletedCount ?? 0 },
  ];
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
  const phone = clean(input?.phone).replaceAll(/\D/g, '') || account?.phone || '';
  const stamped = await UserModel.find({ 'auth.email': addresses }, { _id: 1 }).lean();
  const holders = await runPhoneHolders(anyRunAddress(email, stamp), phone, stamp, Date.now());
  const accounts = [...stamped.map((found) => found._id), ...holders.stale];
  const fixtures = await purgeRunFixtures(accounts, stamp);
  for (const id of accounts) {
    await purgeAccount(String(id));
  }

  const records: PurgedCollection[] = [
    ...fixtures,
    await purgeChallenges(addresses, phone),
    { collection: 'e2e one-time codes', deleted: await forgetRunAccountCodes(email, phone) },
    await purgeStampedUploads(stamp),
  ];

  logs.server.info('e2eRun', 'purge', {
    stamp,
    accounts: accounts.length,
    earlier_run_accounts: holders.stale.length,
    phone_checked: Boolean(phone),
    phone_held: Boolean(holders.heldBy),
    records,
  });
  return { accounts_deleted: accounts.length, records, phone_held_by: holders.heldBy };
}
