import { Types } from 'mongoose';
import type { AnalyticsLeaderboard, AnalyticsLeaderRow } from './shapes';
import type { AnalyticsWindow } from './window';
import {
  analyticsOptOuts,
  memberNames,
  periodSyncers,
  syncsOf,
  type InviterRow,
  type MemberSync,
} from './contacts.data';

/**
 * Marketing > Contacts' one table: the members who synced a phone book or sent
 * invites in the period, with what came of it.
 *
 * Only those members are named — never anybody in their phone books. A member
 * whose newest privacy choice declined analytics is still counted in every
 * tile, but left out of this table.
 */

const LEADERS = 25;
/** Candidates read from each side before the opted-out and deleted are dropped. */
const POOL = 100;
const DAY_MS = 86_400_000;

const daysSince = (date: Date, now: number) => Math.max(0, Math.floor((now - date.getTime()) / DAY_MS));

function rowOf(
  id: string,
  name: string,
  sent: number,
  joined: number,
  sync: MemberSync | undefined,
  now: number
): AnalyticsLeaderRow {
  return {
    id,
    name,
    caption: null,
    values: [
      sent,
      joined,
      sync ? sync.submitted : null,
      sync ? sync.matched : null,
      sync ? daysSince(sync.synced_at, now) : null,
    ],
  };
}

export async function contactMembers(
  window: AnalyticsWindow,
  inviters: readonly InviterRow[],
  joinedBy: ReadonlyMap<string, number>
): Promise<AnalyticsLeaderboard> {
  const sentBy = new Map(inviters.filter((row) => row._id.current).map((row) => [row._id.inviter, row.sent]));
  const topInviters = [...sentBy.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, POOL)
    .map(([id]) => id)
    .filter((id) => Types.ObjectId.isValid(id));
  const syncers = await periodSyncers(window, POOL);
  const hex = [...new Set([...topInviters, ...syncers.map((row) => row.owner_id.toHexString())])];
  const ids = hex.map((id) => new Types.ObjectId(id));
  const [syncs, optedOut, names] = await Promise.all([syncsOf(ids), analyticsOptOuts(ids), memberNames(ids)]);
  const syncBy = new Map(syncs.map((row) => [row.owner_id.toHexString(), row]));
  const now = Date.now();
  const rows = hex
    .filter((id) => names.has(id) && !optedOut.has(id))
    .map((id) =>
      rowOf(id, names.get(id) ?? id, sentBy.get(id) ?? 0, joinedBy.get(id) ?? 0, syncBy.get(id), now)
    )
    .sort((a, b) => (b.values[0] ?? 0) - (a.values[0] ?? 0) || (b.values[2] ?? 0) - (a.values[2] ?? 0))
    .slice(0, LEADERS);
  return {
    key: 'ctc_top_members',
    columns: [
      { key: 'ctc_invites_sent', format: 'COUNT' },
      { key: 'ctc_invites_joined', format: 'COUNT' },
      { key: 'ctc_synced_contacts', format: 'COUNT' },
      { key: 'ctc_matched_contacts', format: 'COUNT' },
      { key: 'ctc_days_since_sync', format: 'DAYS' },
    ],
    rows,
  };
}
