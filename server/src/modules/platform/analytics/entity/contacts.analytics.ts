import { phoneKey } from '@utils/phone';
import { consoleLink } from './links';
import { countOf, splitPeriod, type PeriodTotals } from './aggregates';
import { dayTotals, seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsTrend,
  type EntityAnalyticsSections,
} from './shapes';
import {
  BOOK_BOUNDS,
  MATCH_BOUNDS,
  connectionDays,
  inviteDays,
  inviterCounts,
  joinedAfterInvite,
  sentInvites,
  syncDays,
  syncState,
  type InviteDay,
  type SentInvite,
  type SyncState,
} from './contacts.data';
import { contactMembers } from './contacts.members';

/**
 * Marketing > Contacts — how members use "Your Contacts": who synced a phone
 * book, how many of those contacts were already on Duncit, and what the
 * WhatsApp invites they sent from it turned into. Every tile is a count; see
 * contacts.data.ts for the data-protection line this page keeps.
 */

const PAGE = consoleLink('marketing', '/contacts');
/** The WhatsApp log, narrowed to the invite campaign — the rows behind every invite number. */
const INVITE_LOG = consoleLink('communications', '/whatsapp?selectedtab=logs&wacampaign=contact_invite');

const BOOK_KEYS = ['book_0', 'book_1_49', 'book_50_199', 'book_200_499', 'book_500_999', 'book_1000_plus'];
const FOUND_KEYS = ['found_0', 'found_1_4', 'found_5_19', 'found_20_49', 'found_50_plus'];
const OUTCOMES = ['SENT', 'FAILED', 'SKIPPED'];

/** `$bucket` rows (keyed by their lower bound) as counts per band key. */
function bandCounts(rows: SyncState['sizes'], bounds: readonly number[], keys: readonly string[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const index = bounds.indexOf(Number(row._id));
    if (index >= 0) counts.set(keys[index], row.count);
  }
  return counts;
}

interface Joined {
  now: number;
  before: number;
  series: number[];
  /** Joins credited to each inviter, for numbers first invited in this period. */
  byInviter: Map<string, number>;
}

/** Invited numbers that became members, split by the period of their first invite. Each number counts once. */
function splitJoined(invites: readonly SentInvite[], joined: ReadonlyMap<string, Date>, window: AnalyticsWindow): Joined {
  const result: Joined = { now: 0, before: 0, series: [], byInviter: new Map() };
  const counted = new Set<string>();
  const signups: Date[] = [];
  for (const invite of invites) {
    const key = phoneKey(invite._id);
    const date = joined.get(key);
    if (!date || counted.has(key)) continue;
    counted.add(key);
    if (invite.first < window.from) {
      result.before += 1;
      continue;
    }
    result.now += 1;
    signups.push(date);
    for (const inviter of invite.inviters) result.byInviter.set(inviter, (result.byInviter.get(inviter) ?? 0) + 1);
  }
  result.series = seriesFromDays(dayTotals(signups, (date) => date, window.zone), window);
  return result;
}

function contactKpis(
  state: SyncState,
  syncs: PeriodTotals,
  connections: PeriodTotals,
  invites: Record<'sent' | 'failed' | 'cost', PeriodTotals>,
  inviters: { now: number; before: number },
  joined: Joined
): AnalyticsKpi[] {
  const totals = state.totals[0] ?? { members: 0, contacts: 0, matched: 0 };
  const worse = { higherIsBetter: false, link: INVITE_LOG };
  return [
    kpi('ctc_syncing_members', totals.members, null),
    kpi('ctc_synced_contacts', totals.contacts, null),
    kpi('ctc_matched_contacts', totals.matched, null),
    kpi('ctc_match_rate', pct(totals.matched, totals.contacts), null, { format: 'PERCENT' }),
    // A member's sync row is overwritten by their next sync, so an earlier period cannot be re-read.
    kpi('ctc_recent_syncs', syncs.now, null),
    kpi('ctc_new_connections', connections.now, connections.before),
    kpi('ctc_invites_sent', invites.sent.now, invites.sent.before, { link: INVITE_LOG }),
    kpi('ctc_invites_failed', invites.failed.now, invites.failed.before, worse),
    kpi('ctc_inviters', inviters.now, inviters.before, { link: INVITE_LOG }),
    kpi('ctc_invites_joined', joined.now, joined.before),
    kpi('ctc_invite_conversion', pct(joined.now, invites.sent.now), pct(joined.before, invites.sent.before), {
      format: 'PERCENT',
    }),
    kpi('ctc_invite_cost', invites.cost.now, invites.cost.before, { ...worse, format: 'CURRENCY' }),
  ];
}

function contactBreakdowns(state: SyncState, inviteRows: readonly InviteDay[]): AnalyticsBreakdown[] {
  const current = inviteRows.filter((row) => row._id.current);
  const outcomes = new Map([
    ['SENT', current.reduce((sum, row) => sum + row.sent, 0)],
    ['FAILED', current.reduce((sum, row) => sum + row.failed, 0)],
    ['SKIPPED', current.reduce((sum, row) => sum + row.skipped, 0)],
  ]);
  const allTime = { scope: 'ALL_TIME', ordered: true } as const;
  return [
    breakdown('ctc_invite_outcomes', fixedSlices(OUTCOMES, outcomes), { link: INVITE_LOG }),
    breakdown('ctc_phone_book_size', fixedSlices(BOOK_KEYS, bandCounts(state.sizes, BOOK_BOUNDS, BOOK_KEYS)), allTime),
    breakdown('ctc_found_per_member', fixedSlices(FOUND_KEYS, bandCounts(state.matches, MATCH_BOUNDS, FOUND_KEYS)), allTime),
  ];
}

export async function contactsAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [[loaded], syncRows, connectionRows, inviteRows, inviterRows, invites] = await Promise.all([
    syncState(),
    syncDays(window),
    connectionDays(window),
    inviteDays(window),
    inviterCounts(window),
    sentInvites(window),
  ]);
  const joined = splitJoined(invites, await joinedAfterInvite(invites), window);
  const syncs = splitPeriod(syncRows, window, countOf);
  const connections = splitPeriod(connectionRows, window, countOf);
  const sent = splitPeriod(inviteRows, window, (row) => row.sent);
  const failed = splitPeriod(inviteRows, window, (row) => row.failed);
  const cost = splitPeriod(inviteRows, window, (row) => row.cost);
  const roundedCost = { ...cost, now: Math.round(cost.now * 100) / 100, before: Math.round(cost.before * 100) / 100 };
  const inviters = {
    now: inviterRows.filter((row) => row._id.current).length,
    before: inviterRows.filter((row) => !row._id.current).length,
  };
  const state: SyncState = loaded ?? { totals: [], sizes: [], matches: [] };
  const trends: AnalyticsTrend[] = [
    trend('ctc_syncs', window, [
      { key: 'ctc_recent_syncs', values: syncs.series },
      { key: 'ctc_new_connections', values: connections.series },
    ]),
    trend(
      'ctc_invites',
      window,
      [
        { key: 'ctc_invites_sent', values: sent.series },
        { key: 'ctc_invites_failed', values: failed.series },
        { key: 'ctc_invites_joined', values: joined.series },
      ],
      'COUNT',
      INVITE_LOG
    ),
  ];
  return linkEverything(
    {
      kpis: contactKpis(state, syncs, connections, { sent, failed, cost: roundedCost }, inviters, joined),
      trends,
      breakdowns: contactBreakdowns(state, inviteRows),
      leaderboard: await contactMembers(window, inviterRows, joined.byInviter),
    },
    PAGE
  );
}
