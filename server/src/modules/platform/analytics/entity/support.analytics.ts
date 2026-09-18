import { TICKET_SOURCES } from '@modules/support/ticket/ticket.model';
import { bucketSeries, type AnalyticsWindow } from './window';
import { consoleLink } from './links';
import { userNames } from './lookups';
import {
  STAR_KEYS,
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  mean,
  rankedSlices,
  tally,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import {
  countBacklog,
  loadAgentWork,
  loadCallbacks,
  loadChats,
  loadProblemCategories,
  loadProblems,
  loadRatings,
  loadReopens,
  loadSosAlerts,
  loadTicketPeriod,
  type OpenedTicket,
  type RatingRow,
  type ResolvedTicket,
  type TicketPeriod,
} from './support.data';
import { countOf, median, splitPeriod } from './aggregates';

/**
 * Analytics > Support — every way a member reached support in the period
 * (tickets, chats, callbacks, SOS alerts, reported problems), how fast support
 * answered and closed them, how members rated it, and who at support did the
 * work. Contacts are counted by when they arrived, so a rise in any of them is
 * more people who hit a problem.
 */

const HOME = consoleLink('support', '/');
const TICKETS = consoleLink('support', '/tickets');
const CHATS = consoleLink('support', '/live-chat');
const CALLBACKS = consoleLink('support', '/callbacks');
const SOS = consoleLink('support', '/sos');
const PROBLEMS = consoleLink('support', '/reported-problems');

const CATEGORIES = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'] as const;
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const STATUSES = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
const AGENT_COLUMNS = ['sup_tickets_handled', 'sup_replies', 'sup_chats_handled', 'sup_callbacks_made', 'sup_sos_resolved'];

const replyTimes = (rows: readonly OpenedTicket[]) =>
  rows.flatMap((row) => (row.first_reply_ms === null ? [] : [row.first_reply_ms]));

/** Each ticket tile's value for one period — computed identically for both periods. */
const ticketFigures = ({ opened, resolved }: TicketPeriod) => ({
  opened: opened.length,
  resolved: resolved.length,
  first_reply: median(replyTimes(opened)),
  resolve_time: median(resolved.map((row) => row.resolve_ms)),
});

/** The average score given in one of the two periods. */
function averageRating(rows: readonly RatingRow[], current: boolean): number {
  const own = rows.filter((row) => row._id.current === current);
  return mean(total(own.map((row) => row._id.rating * row.count)), total(own.map((row) => row.count)));
}

function starCounts(rows: readonly RatingRow[]): Map<string, number> {
  const stars = new Map<string, number>();
  for (const row of rows.filter((item) => item._id.current)) {
    const key = String(row._id.rating);
    stars.set(key, (stars.get(key) ?? 0) + row.count);
  }
  return stars;
}

function supportBreakdowns(
  opened: readonly OpenedTicket[],
  problems: ReadonlyArray<{ _id: string; count: number }>,
  ratings: readonly RatingRow[]
): AnalyticsBreakdown[] {
  const tickets = { link: TICKETS };
  const inOrder = { link: TICKETS, ordered: true };
  return [
    breakdown('sup_by_category', fixedSlices(CATEGORIES, tally(opened.map((row) => row.category))), tickets),
    breakdown('sup_by_channel', fixedSlices(TICKET_SOURCES, tally(opened.map((row) => row.source))), tickets),
    breakdown('sup_by_priority', fixedSlices(PRIORITIES, tally(opened.map((row) => row.priority))), inOrder),
    breakdown('sup_by_status', fixedSlices(STATUSES, tally(opened.map((row) => row.status))), inOrder),
    breakdown(
      'sup_problem_categories',
      rankedSlices(problems, (row) => row._id, (row) => row.count),
      { link: PROBLEMS }
    ),
    breakdown('sup_rating_stars', fixedSlices(STAR_KEYS, starCounts(ratings)), inOrder),
  ];
}

type AgentWork = Awaited<ReturnType<typeof loadAgentWork>>;

/** Conversations each person at support picked up, most first. No agent page exists, so rows link nowhere. */
async function agentLeaderboard([replies, chats, callbacks, sos]: AgentWork): Promise<AnalyticsLeaderboard> {
  const work = new Map<string, number[]>();
  const add = (id: string, column: number, value: number) => {
    const values = work.get(id) ?? AGENT_COLUMNS.map(() => 0);
    values[column] += value;
    work.set(id, values);
  };
  for (const row of replies) {
    add(String(row._id), 0, row.tickets);
    add(String(row._id), 1, row.replies);
  }
  for (const row of chats) add(String(row._id), 2, row.count);
  for (const row of callbacks) add(String(row._id), 3, row.count);
  for (const row of sos) add(String(row._id), 4, row.count);
  // Replies are not a conversation of their own, so they only break ties.
  const handled = (values: number[]) => values[0] + values[2] + values[3] + values[4];
  const ranked = [...work.entries()].sort(([, a], [, b]) => handled(b) - handled(a) || b[1] - a[1]).slice(0, 10);
  const names = await userNames(ranked.map(([id]) => id));
  return {
    key: 'sup_agents',
    columns: AGENT_COLUMNS.map((key) => ({ key, format: 'COUNT' as const })),
    rows: ranked.map(([id, values]) => ({ id, name: names.get(id) ?? '', caption: null, values })),
    link: TICKETS,
  };
}

export async function supportAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, reopens, chats, callbacks, sos, problems, ratings, backlog, problemCategories, agentWork] =
    await Promise.all([
      loadTicketPeriod(window.from, window.to),
      loadTicketPeriod(window.prevFrom, window.prevTo),
      loadReopens(window),
      loadChats(window),
      loadCallbacks(window),
      loadSosAlerts(window),
      loadProblems(window),
      loadRatings(window),
      countBacklog(),
      loadProblemCategories(window.from, window.to),
      loadAgentWork(window.from, window.to),
    ]);
  const { opened, resolved } = current;
  const now = ticketFigures(current);
  const before = ticketFigures(previous);
  const reopened = splitPeriod(reopens, window, countOf);
  const started = splitPeriod(chats, window, (row) => row.started);
  const answered = splitPeriod(chats, window, (row) => row.answered);
  const callbackCounts = splitPeriod(callbacks, window, countOf);
  const sosCounts = splitPeriod(sos, window, countOf);
  const problemCounts = splitPeriod(problems, window, countOf);
  const openedAt = (row: OpenedTicket) => row.created_at;
  const resolvedAt = (row: ResolvedTicket) => row.resolved_at;
  const rising = { higherIsBetter: false };
  const slower = { format: 'DURATION', higherIsBetter: false, link: TICKETS } as const;

  const sections: EntityAnalyticsSections = {
    kpis: [
      kpi('sup_tickets_opened', now.opened, before.opened, { ...rising, link: TICKETS }),
      kpi('sup_tickets_resolved', now.resolved, before.resolved, { link: TICKETS }),
      kpi('sup_backlog', backlog, null, { ...rising, link: TICKETS }),
      kpi('sup_first_reply', now.first_reply, before.first_reply, slower),
      kpi('sup_resolve_time', now.resolve_time, before.resolve_time, slower),
      kpi('sup_reopened', reopened.now, reopened.before, { ...rising, link: TICKETS }),
      kpi('sup_csat', averageRating(ratings, true), averageRating(ratings, false), { format: 'RATING', link: TICKETS }),
      kpi('sup_chats_started', started.now, started.before, { ...rising, link: CHATS }),
      kpi('sup_chats_answered', answered.now, answered.before, { link: CHATS }),
      kpi('sup_callbacks', callbackCounts.now, callbackCounts.before, { ...rising, link: CALLBACKS }),
      kpi('sup_sos_alerts', sosCounts.now, sosCounts.before, { ...rising, link: SOS }),
      kpi('sup_problems_reported', problemCounts.now, problemCounts.before, { ...rising, link: PROBLEMS }),
    ],
    trends: [
      trend(
        'sup_tickets',
        window,
        [
          { key: 'sup_tickets_opened', values: bucketSeries(opened, openedAt, window, (rows) => rows.length) },
          { key: 'sup_tickets_resolved', values: bucketSeries(resolved, resolvedAt, window, (rows) => rows.length) },
          { key: 'sup_reopened', values: reopened.series },
        ],
        'COUNT',
        TICKETS
      ),
      trend(
        'sup_response_times',
        window,
        [
          { key: 'sup_first_reply', values: bucketSeries(opened, openedAt, window, (rows) => median(replyTimes(rows))) },
          {
            key: 'sup_resolve_time',
            values: bucketSeries(resolved, resolvedAt, window, (rows) => median(rows.map((row) => row.resolve_ms))),
          },
        ],
        'DURATION',
        TICKETS
      ),
      trend(
        'sup_contacts',
        window,
        [
          { key: 'sup_chats_started', values: started.series },
          { key: 'sup_callbacks', values: callbackCounts.series },
          { key: 'sup_sos_alerts', values: sosCounts.series },
        ],
        'COUNT',
        HOME
      ),
    ],
    breakdowns: supportBreakdowns(opened, problemCategories, ratings),
    leaderboard: await agentLeaderboard(agentWork),
  };
  return linkEverything(sections, HOME);
}
