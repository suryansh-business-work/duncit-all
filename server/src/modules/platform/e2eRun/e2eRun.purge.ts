import { GraphQLError } from 'graphql';
import { Types, type Model } from 'mongoose';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { UserModel } from '@modules/access/user/user.model';
import { UserChangeLogModel } from '@modules/access/userAudit/userAudit.model';
import { userTrace } from '@modules/access/accountDeletion/accountDeletion.trace';
import { purgeReference } from '@modules/access/accountDeletion/accountDeletion.purge';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodDraftModel } from '@modules/pods/pod-draft/pod-draft.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { PodIdeaModel } from '@modules/pods/podIdea/podIdea.model';
import { TicketModel } from '@modules/support/ticket/ticket.model';
import { BouncerCallbackRequestModel } from '@modules/support/bouncer/bouncer.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { mediaLibraryService } from '@modules/platform/upload/mediaLibrary.service';
import { e2eOverrides } from './e2eRun.mute';

/**
 * Removing what the live e2e suite made.
 *
 * The suite drives the real app: it signs up, applies to host, publishes a
 * pod, raises a ticket and shares an idea. Most of those have no delete a
 * member can call — a ticket cannot be deleted by anyone, an onboarding
 * meeting only cancelled — so the cleanup is a single server-side sweep keyed
 * on the run's identity, called by the CI leg after Cypress whether the suite
 * passed or failed. A failed run is the one that leaves the most behind.
 *
 * Two kinds of leftover, two rules:
 *
 *  - ACCOUNTS whose email carries the run's stamp are removed outright, with
 *    everything that points at them, by the same schema-driven trace the
 *    account-deletion console walks. The signup identity is unique to the run
 *    and nothing about it is worth keeping.
 *  - RECORDS the sign-in account created are found by the MARKER the suite
 *    puts in their title or subject — `[E2E <stamp>]` — and scoped to that
 *    account. The account itself is a real host on staging and stays.
 *
 * Refused unless this server has "Return one-time codes" switched on: that
 * switch is what declares a database an e2e target, and it is the one the
 * settings page says must never be on for production. A purge that could run
 * against production would be a delete-by-email for anyone with the token.
 */

const STAMP_RE = /^\d{12}$/;

const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/** `[E2E 070920260300]` — what the suite writes into every record's title or subject. */
export const runMarker = (stamp: string): string => `[E2E ${stamp}]`;

export interface PurgeE2eRunDataInput {
  stamp: string;
  login_email: string;
  signup_email: string;
}

interface PurgedCollection {
  collection: string;
  deleted: number;
}

const clean = (value: unknown): string => String(value ?? '').trim();

/**
 * Every address this run signed up as: the signup address itself, and any the
 * suite derived from it by suffixing the local part (`riya+0709…-dup@…`).
 * Anchored at both ends and escaped, so `+` in a Gmail address is a plus.
 */
function stampedAccountsFilter(signupEmail: string, stamp: string): Record<string, unknown> {
  const at = signupEmail.lastIndexOf('@');
  if (at <= 0) throw badInput('signup_email must be an email address.');
  const local = signupEmail.slice(0, at);
  const domain = signupEmail.slice(at + 1);
  if (!local.includes(stamp)) {
    throw badInput('The signup address does not carry the run stamp, so it is not this run’s account.');
  }
  return {
    'auth.email': new RegExp(`^${escapeRe(local)}(?:-[a-z0-9-]{1,40})?@${escapeRe(domain)}$`, 'i'),
  };
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
 * The sign-in account's stamped pods — including the ones the suite already
 * cancelled, which are soft-deleted and would otherwise sit there forever.
 * A held venue slot is released first: the pod is what holds it, and a slot
 * left PENDING is the next run finding no tile to click.
 */
async function purgeStampedPods(host: Types.ObjectId, title: RegExp): Promise<PurgedCollection[]> {
  // `deleted_at` named explicitly: the model's read hook hides soft-deleted
  // pods from any query that does not mention the field.
  const pods = await PodModel.find(
    { pod_hosts_id: host, pod_title: title, deleted_at: { $exists: true } },
    { _id: 1 }
  ).lean();
  const ids = pods.map((pod) => pod._id as Types.ObjectId);
  if (ids.length === 0) {
    return [
      { collection: PodModel.collection.name, deleted: 0 },
      { collection: PodAuditLogModel.collection.name, deleted: 0 },
    ];
  }
  for (const id of ids) {
    await venueSlotService.releaseForPod(String(id));
  }
  const audits = await PodAuditLogModel.deleteMany({ pod_id: { $in: ids } });
  const removed = await PodModel.deleteMany({ _id: { $in: ids } });
  return [
    { collection: PodModel.collection.name, deleted: removed.deletedCount ?? 0 },
    { collection: PodAuditLogModel.collection.name, deleted: audits.deletedCount ?? 0 },
  ];
}

/** Everything the sign-in account named with the marker, collection by collection. */
async function purgeStampedRecords(user: Types.ObjectId, marker: RegExp): Promise<PurgedCollection[]> {
  const rows = await purgeStampedPods(user, marker);
  const owned: Array<{ model: Model<any>; filter: Record<string, unknown> }> = [
    { model: PodDraftModel, filter: { user_id: user, pod_title: marker } },
    { model: TicketModel, filter: { user_id: user, subject: marker } },
    { model: BouncerCallbackRequestModel, filter: { user_id: user, reason: marker } },
    { model: PodIdeaModel, filter: { author_id: user, title: marker } },
  ];
  for (const { model, filter } of owned) {
    const res = await model.deleteMany(filter);
    rows.push({ collection: model.collection.name, deleted: res.deletedCount ?? 0 });
  }
  return rows;
}

/**
 * The cover the pod scenario uploaded. It is named `e2e-<stamp>-cover.jpg`
 * for exactly this lookup; ImageKit keeps its own storage, and a nightly
 * picture nobody deletes is a quota that fills. Best-effort: an ImageKit that
 * is not configured, or not reachable, must not fail the purge of everything
 * else, so it reports zero and says why in the log.
 */
async function purgeCoverUploads(stamp: string): Promise<PurgedCollection> {
  const collection = 'imagekit:/pods';
  try {
    const files = await mediaLibraryService.list({ search: `e2e-${stamp}`, path: '/pods', limit: 100 });
    const deleted = await mediaLibraryService.remove(
      files.map((file) => file.fileId),
      { id: 'e2e-purge' }
    );
    return { collection, deleted };
  } catch (error) {
    logs.server.warn('e2eRun', 'purgeCoverUploads', { error, stamp });
    return { collection, deleted: 0 };
  }
}

export async function purgeE2eRunData(input: PurgeE2eRunDataInput) {
  const stamp = clean(input?.stamp);
  if (!STAMP_RE.test(stamp)) throw badInput('stamp must be the run’s ddMMyyyyHHmm identity stamp.');
  const signupEmail = clean(input?.signup_email).toLowerCase();
  const loginEmail = clean(input?.login_email).toLowerCase();
  if (!signupEmail || !loginEmail) throw badInput('Both the login and the signup address are required.');

  if (!(await e2eOverrides()).otpBypass) {
    throw new GraphQLError(
      'This server is not an e2e target: "Return one-time codes" is off in Tech > E2E Tests > Settings, so no suite could have created anything here and nothing will be purged.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }

  const login = await UserModel.findOne({ 'auth.email': loginEmail }, { _id: 1 }).lean();
  if (!login) throw badInput(`No account with the address ${loginEmail} exists on this server.`);

  const accounts = await UserModel.find(stampedAccountsFilter(signupEmail, stamp), { _id: 1 }).lean();
  for (const account of accounts) {
    await purgeAccount(String(account._id));
  }

  const records = await purgeStampedRecords(login._id as Types.ObjectId, new RegExp(escapeRe(runMarker(stamp))));
  records.push(await purgeCoverUploads(stamp));

  logs.server.info('e2eRun', 'purge', { stamp, accounts: accounts.length, records });
  return { accounts_deleted: accounts.length, records };
}
