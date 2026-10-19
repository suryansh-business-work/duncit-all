import { Types } from 'mongoose';
import { ContactMatchModel, ContactSyncModel } from '@modules/access/contacts/contacts.model';
import { INVITE_EVENT, keysOfUser } from '@modules/access/contacts/contacts.invite';
import { UserModel } from '@modules/access/user/user.model';
import { TrackingConsentEventModel } from '@modules/access/privacy/privacy.model';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { phoneKey } from '@utils/phone';
import { perDay, periodGroup, type CountRow, type PeriodDayKey } from './aggregates';
import { when } from './communications.data';
import { inEitherPeriod, inRange, type AnalyticsWindow } from './window';

/**
 * Everything Marketing > Contacts reads: the phone-book syncs members ran, the
 * accounts those syncs found, and the WhatsApp invites members sent from them.
 *
 * GDPR line: every number here is a COUNT. A synced phone book belongs to
 * people who never agreed to anything with Duncit, so no number, label or
 * destination of a non-member ever leaves these queries — the invite numbers
 * are compared with member accounts inside the server and dropped. The only
 * people named are the members who ran a sync or sent an invite, and not
 * those whose newest privacy choice declined analytics.
 */

const INVITES = { event_key: INVITE_EVENT };

/** Members by the day their most recent sync landed — one `ContactSync` row per member. */
export const syncDays = (window: AnalyticsWindow) =>
  ContactSyncModel.aggregate<CountRow>(perDay('synced_at', window));

/** Contacts found on Duncit for the first time, per day. */
export const connectionDays = (window: AnalyticsWindow) =>
  ContactMatchModel.aggregate<CountRow>(perDay('created_at', window));

export interface InviteDay {
  _id: PeriodDayKey;
  sent: number;
  failed: number;
  skipped: number;
  cost: number;
}

/** Invite sends per day of both periods, as the WhatsApp log recorded them. */
export const inviteDays = (window: AnalyticsWindow) =>
  WaMessageLogModel.aggregate<InviteDay>([
    { $match: { ...INVITES, ...inEitherPeriod('created_at', window) } },
    periodGroup('created_at', window, {
      sent: when('SENT'),
      failed: when('FAILED'),
      skipped: when('SKIPPED'),
      cost: when('SENT', { $ifNull: ['$msg_rate', 0] }),
    }),
  ]);

export interface InviterRow {
  _id: { inviter: string; current: boolean };
  sent: number;
}

/** Invites that went out, per inviting member and period. */
export const inviterCounts = (window: AnalyticsWindow) =>
  WaMessageLogModel.aggregate<InviterRow>([
    { $match: { ...INVITES, status: 'SENT', ...inEitherPeriod('created_at', window) } },
    {
      $group: {
        _id: { inviter: '$entity_id', current: { $gte: ['$created_at', window.from] } },
        sent: { $sum: 1 },
      },
    },
  ]);

export interface SentInvite {
  /** The number the invite went to — compared with member accounts here, never returned. */
  _id: string;
  first: Date;
  inviters: string[];
}

/** Every number invited in either period, when it was first invited, and by whom. */
export const sentInvites = (window: AnalyticsWindow) =>
  WaMessageLogModel.aggregate<SentInvite>([
    { $match: { ...INVITES, status: 'SENT', ...inEitherPeriod('created_at', window) } },
    { $group: { _id: '$destination', first: { $min: '$created_at' }, inviters: { $addToSet: '$entity_id' } } },
  ]);

interface InvitedAccount {
  auth?: { phone?: { number?: string } };
  communication?: { whatsapp?: { number?: string } };
  metadata?: { created_at?: Date };
}

/**
 * Which invited numbers became a Duncit account AFTER their first invite —
 * answered as phone key → sign-up date. One `$in` on the two indexed phone
 * fields; the keys never leave this function.
 */
export async function joinedAfterInvite(invites: readonly SentInvite[]): Promise<Map<string, Date>> {
  const firstByKey = new Map<string, Date>();
  for (const invite of invites) {
    const key = phoneKey(invite._id);
    const seen = firstByKey.get(key);
    if (key && (!seen || invite.first < seen)) firstByKey.set(key, invite.first);
  }
  const joined = new Map<string, Date>();
  if (firstByKey.size === 0) return joined;
  const keys = [...firstByKey.keys()];
  // A reduce, not Math.min(...dates): a year of invites can outgrow the argument limit.
  const earliestMs = [...firstByKey.values()].reduce((min, date) => Math.min(min, date.getTime()), Number.POSITIVE_INFINITY);
  const earliest = new Date(earliestMs);
  const users = await UserModel.find({
    $or: [{ 'auth.phone.number': { $in: keys } }, { 'communication.whatsapp.number': { $in: keys } }],
    'metadata.created_at': { $gt: earliest },
  })
    .select('auth.phone.number communication.whatsapp.number metadata.created_at')
    .lean<InvitedAccount[]>();
  for (const user of users) {
    const created = user.metadata?.created_at;
    if (!created) continue;
    for (const key of keysOfUser(user)) {
      const first = firstByKey.get(key);
      if (first && created > first) joined.set(key, created);
    }
  }
  return joined;
}

export interface SyncState {
  totals: Array<{ members: number; contacts: number; matched: number }>;
  sizes: Array<{ _id: number | string; count: number }>;
  matches: Array<{ _id: number | string; count: number }>;
}

/** Lower bounds of the phone-book size bands; a sync is capped at 5000 entries. */
export const BOOK_BOUNDS = [0, 1, 50, 200, 500, 1000] as const;
/** Lower bounds of the found-on-Duncit bands. */
export const MATCH_BOUNDS = [0, 1, 5, 20, 50] as const;

const bucket = (field: string, bounds: readonly number[]) => ({
  $bucket: {
    groupBy: `$${field}`,
    boundaries: [...bounds, Number.MAX_SAFE_INTEGER],
    default: 'other',
    output: { count: { $sum: 1 } },
  },
});

/**
 * Where every member's contacts sync stands right now. `ContactSync` holds one
 * row per member who ever synced — bounded by the member count, never by the
 * size of anybody's phone book — so the whole collection is read in one pass.
 */
export const syncState = () =>
  ContactSyncModel.aggregate<SyncState>([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              members: { $sum: 1 },
              contacts: { $sum: '$submitted' },
              matched: { $sum: '$matched' },
            },
          },
        ],
        sizes: [bucket('submitted', BOOK_BOUNDS)],
        matches: [bucket('matched', MATCH_BOUNDS)],
      },
    },
  ]);

export interface MemberSync {
  owner_id: Types.ObjectId;
  submitted: number;
  matched: number;
  synced_at: Date;
}

/** The members whose latest sync landed in the period, biggest phone books first. */
export const periodSyncers = (window: AnalyticsWindow, limit: number) =>
  ContactSyncModel.find({ synced_at: inRange(window.from, window.to) })
    .select('owner_id submitted matched synced_at')
    .sort({ submitted: -1 })
    .limit(limit)
    .lean<MemberSync[]>();

/** The sync on file for each of these members. */
export const syncsOf = (ids: readonly Types.ObjectId[]) =>
  ContactSyncModel.find({ owner_id: { $in: ids } })
    .select('owner_id submitted matched synced_at')
    .lean<MemberSync[]>();

/** Members whose newest privacy choice declined analytics — counted, never named. */
export async function analyticsOptOuts(ids: readonly Types.ObjectId[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await TrackingConsentEventModel.aggregate<{ _id: Types.ObjectId; analytics: boolean }>([
    { $match: { user_id: { $in: ids } } },
    { $sort: { user_id: 1, created_at: -1 } },
    { $group: { _id: '$user_id', analytics: { $first: '$analytics' } } },
    { $match: { analytics: false } },
  ]);
  return new Set(rows.map((row) => row._id.toHexString()));
}

/**
 * Live members' display names — the name on the profile, else the handle, else
 * the account id. Deliberately no email or phone: the table names who did
 * something, it does not hand out how to reach them.
 */
export async function memberNames(ids: readonly Types.ObjectId[]): Promise<Map<string, string>> {
  const users = await UserModel.find({ _id: { $in: ids }, 'metadata.deleted_at': null })
    .select('profile.first_name profile.last_name profile.username')
    .lean<Array<{ _id: Types.ObjectId; profile?: { first_name?: string; last_name?: string; username?: string } }>>();
  return new Map(
    users.map((user) => {
      const id = user._id.toHexString();
      const full = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
      const handle = user.profile?.username ? `@${user.profile.username}` : '';
      return [id, full || handle || id];
    })
  );
}
