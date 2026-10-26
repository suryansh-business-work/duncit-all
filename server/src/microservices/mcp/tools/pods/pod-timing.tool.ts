import { GraphQLError, parse } from 'graphql';
import { z } from 'zod';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { defineTool } from '../define';
import { auditPodTimings, type PodTimingRow, type TimingIssue } from './pod-timing.audit';

/**
 * pods_audit_timings — "audit every pod's timing": reads the pods in a window
 * through `podsTable` (so it sees exactly the pods the caller's console shows,
 * with the same permission check) and runs the rules in pod-timing.audit.ts.
 * Read-only: it reports, it never fixes.
 */

const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAST_DAYS = 30;
const DEFAULT_FUTURE_DAYS = 60;

const POD_TIMING_QUERY = parse(/* GraphQL */ `
  query McpPodTimingAudit($query: TableQueryInput, $include_deleted: Boolean) {
    podsTable(query: $query, include_deleted: $include_deleted) {
      rows {
        id
        pod_title
        pod_date_time
        pod_end_date_time
        venue_id
        pod_hosts_id
        pod_mode
        is_deleted
        completed_at
        created_at
      }
      total
    }
  }
`);

const isoDate = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Use an ISO date, e.g. 2026-10-01');
const minutesField = (what: string) => z.number().int().min(0).max(100_000).optional().describe(what);

const schema = z
  .object({
    from: isoDate.optional().describe(`Start of the window (ISO date). Default: ${DEFAULT_PAST_DAYS} days ago.`),
    to: isoDate.optional().describe(`End of the window (ISO date). Default: ${DEFAULT_FUTURE_DAYS} days from now.`),
    club_id: z.string().min(1).max(64).optional().describe('Only pods of this club.'),
    venue_id: z.string().min(1).max(64).optional().describe('Only pods at this venue.'),
    include_cancelled: z.boolean().default(false).describe('Also check cancelled pods (admins only).'),
    min_duration_minutes: minutesField('Flag pods shorter than this.'),
    max_duration_minutes: minutesField('Flag pods longer than this.'),
    completion_grace_minutes: minutesField('Flag pods still not completed this many minutes after they ended.'),
    max_pods: z.number().int().min(1).max(2000).default(500).describe('Stop after reading this many pods.'),
    max_issues: z.number().int().min(1).max(500).default(200).describe('Return at most this many issues (errors first).'),
  })
  .strict();

interface PodPage {
  podsTable?: { rows: PodTimingRow[]; total: number } | null;
}

/** One entry of TableQueryInput.filters. */
interface TableFilter {
  field: string;
  op: 'between' | 'eq';
  value?: string;
  values?: string[];
}

export const podTimingAuditTool = defineTool({
  name: 'pods_audit_timings',
  title: 'Audit pod timings',
  description:
    '[Pods · Read-only] Checks that every pod in a date window has a sane schedule: a valid start and end, end after start, not completed before it began, not created after it started, no two live pods overlapping at one venue, no host double-booked — plus duration bounds and overdue completion when you pass those thresholds. Reads through podsTable with your own permissions; never changes anything. Returns a summary by check and the issues (errors first).',
  category: 'pods',
  listedOn: [GATEWAY_ENDPOINT, 'pods', 'admin', 'regional-club-admin'],
  schema,
  async run(context, args) {
    const now = Date.now();
    const to = args.to ? new Date(args.to) : new Date(now + DEFAULT_FUTURE_DAYS * DAY_MS);
    const from = args.from ? new Date(args.from) : new Date(now - DEFAULT_PAST_DAYS * DAY_MS);
    if (from >= to) throw new GraphQLError('`from` must be before `to`', { extensions: { code: 'BAD_USER_INPUT' } });

    const filters: TableFilter[] = [
      { field: 'pod_date_time', op: 'between', values: [from.toISOString(), to.toISOString()] },
    ];
    if (args.club_id) filters.push({ field: 'club_id', op: 'eq', value: args.club_id });
    if (args.venue_id) filters.push({ field: 'venue_id', op: 'eq', value: args.venue_id });

    const rows: PodTimingRow[] = [];
    let total = 0;
    for (let page = 1; rows.length < args.max_pods; page += 1) {
      const { data, errors } = await context.execute(POD_TIMING_QUERY, {
        query: { page, page_size: PAGE_SIZE, filters },
        include_deleted: args.include_cancelled,
      });
      const result = (data as PodPage | null | undefined)?.podsTable;
      if (!result) {
        const first = errors?.[0];
        throw new GraphQLError(first?.message ?? 'Pods could not be read', {
          extensions: { code: first?.extensions?.code ?? 'GRAPHQL_ERROR' },
        });
      }
      total = result.total;
      rows.push(...result.rows);
      if (result.rows.length < PAGE_SIZE || rows.length >= total) break;
    }
    const scanned = rows.slice(0, args.max_pods);

    const audit = auditPodTimings(scanned, {
      now,
      minDurationMinutes: args.min_duration_minutes,
      maxDurationMinutes: args.max_duration_minutes,
      completionGraceMinutes: args.completion_grace_minutes,
    });
    const byCheck: Record<string, number> = {};
    for (const issue of audit.issues) byCheck[issue.check] = (byCheck[issue.check] ?? 0) + 1;
    const ordered: TimingIssue[] = [
      ...audit.issues.filter((issue) => issue.severity === 'error'),
      ...audit.issues.filter((issue) => issue.severity === 'warning'),
    ];
    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      pods_in_window: total,
      pods_checked: scanned.length,
      complete: scanned.length >= total,
      errors: audit.issues.filter((issue) => issue.severity === 'error').length,
      warnings: audit.issues.filter((issue) => issue.severity === 'warning').length,
      by_check: byCheck,
      checks_run: audit.checked,
      checks_skipped: audit.skipped,
      issues: ordered.slice(0, args.max_issues),
      issues_truncated: ordered.length > args.max_issues,
    };
  },
});
