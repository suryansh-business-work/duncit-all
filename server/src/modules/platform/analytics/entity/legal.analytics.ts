import { GRIEVANCE_SOURCES, GRIEVANCE_STATUSES } from '@modules/content/grievance/grievanceTicket.model';
import { REPORT_REASONS, REPORT_STATUSES, REPORT_TARGET_TYPES } from '@modules/content/report/contentReport.model';
import type { AnalyticsWindow } from './window';
import { consoleLink } from './links';
import {
  breakdown,
  countMap,
  fixedSlices,
  kpi,
  linkEverything,
  mean,
  pct,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import { countOf, splitPeriod } from './aggregates';
import {
  countOpenCases,
  loadAcceptances,
  loadClosedGrievances,
  loadClosedReports,
  loadFiledGrievances,
  loadFiledReports,
  loadGrievanceMix,
  loadPolicyStanding,
  loadReportMix,
  loadSigning,
  type ClosedRow,
  type PolicyStanding,
  type SigningFigures,
} from './legal.data';

/**
 * Analytics > Legal — the Legal console's queues over a chosen period:
 * grievances and how fast they were closed, what members reported and what
 * came of it, contracts and documents out for signature, and how many accounts
 * have accepted the policies as they read today.
 */

const HOME = consoleLink('legal', '/');
const GRIEVANCES = consoleLink('legal', '/grievance/tickets');
const REPORTS = consoleLink('legal', '/reports');
const DOCUMENTS = consoleLink('legal', '/documents');
const POLICIES = consoleLink('legal', '/policies');
const ACCEPTANCE_LOG = consoleLink('logs', '/policy-acceptance-logs');

const ESCALATION_KEYS = ['leg_with_ticket', 'leg_without_ticket'] as const;
const POLICY_COLUMNS = [
  { key: 'leg_accepted', format: 'COUNT' },
  { key: 'leg_pending', format: 'COUNT' },
  { key: 'leg_acceptance_rate', format: 'PERCENT' },
  { key: 'leg_wordings', format: 'COUNT' },
] as const;

/** Both end states per day, and the average days a closed case had been open, for each period. */
function closedTotals(rows: readonly ClosedRow[], window: AnalyticsWindow) {
  const first = splitPeriod(rows, window, (row) => row.first);
  const second = splitPeriod(rows, window, (row) => row.second);
  const days = splitPeriod(rows, window, (row) => row.days);
  return {
    first,
    second,
    days_now: mean(days.now, first.now + second.now),
    days_before: mean(days.before, first.before + second.before),
  };
}

function signingKpis(rows: readonly SigningFigures[]): AnalyticsKpi[] {
  const sum = (field: keyof SigningFigures) => total(rows.map((row) => row[field]));
  const link = { link: DOCUMENTS };
  return [
    kpi('leg_sent_for_signing', sum('sent_now'), sum('sent_before'), link),
    kpi('leg_signed', sum('signed_now'), sum('signed_before'), link),
    kpi('leg_signing_days', mean(sum('days_now'), sum('signed_now')), mean(sum('days_before'), sum('signed_before')), {
      ...link,
      format: 'DAYS',
      higherIsBetter: false,
    }),
    kpi('leg_awaiting_signature', sum('pending'), null, { ...link, higherIsBetter: false }),
  ];
}

/**
 * The acceptance log is append-only, so an account deleted since it accepted
 * is still in it — never report fewer than nobody still owing.
 */
const owing = (accounts: number, accepted: number) => Math.max(0, accounts - accepted);

/** Each policy signup asks for, the one most accounts still owe first. */
function policyLeaderboard(accounts: number, policies: readonly PolicyStanding[]): AnalyticsLeaderboard {
  const ranked = policies
    .map((policy) => ({ policy, pending: owing(accounts, policy.accepted) }))
    .sort((a, b) => b.pending - a.pending || a.policy.title.localeCompare(b.policy.title))
    .slice(0, 10);
  return {
    key: 'leg_policies',
    columns: [...POLICY_COLUMNS],
    rows: ranked.map(({ policy, pending }) => ({
      id: policy.id,
      name: policy.title,
      caption: null,
      values: [policy.accepted, pending, pct(accounts - pending, accounts), policy.wordings],
    })),
    link: POLICIES,
  };
}

type GrievanceMix = Awaited<ReturnType<typeof loadGrievanceMix>>;
type ReportMix = Awaited<ReturnType<typeof loadReportMix>>;

function legalBreakdowns(grievances: GrievanceMix, reports: ReportMix): AnalyticsBreakdown[] {
  const grievance = { link: GRIEVANCES };
  const report = { link: REPORTS };
  return [
    breakdown('leg_grievance_status', fixedSlices(GRIEVANCE_STATUSES, countMap(grievances.status)), {
      ...grievance,
      ordered: true,
    }),
    breakdown('leg_grievance_source', fixedSlices(GRIEVANCE_SOURCES, countMap(grievances.source)), grievance),
    breakdown('leg_grievance_escalation', fixedSlices(ESCALATION_KEYS, countMap(grievances.escalation)), {
      ...grievance,
      ordered: true,
    }),
    breakdown('leg_report_reason', fixedSlices(REPORT_REASONS, countMap(reports.reason)), report),
    breakdown('leg_report_outcome', fixedSlices(REPORT_STATUSES, countMap(reports.status)), { ...report, ordered: true }),
    breakdown('leg_report_target', fixedSlices(REPORT_TARGET_TYPES, countMap(reports.target)), report),
  ];
}

export async function legalAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [
    filedRows,
    closedRows,
    reportRows,
    reportClosedRows,
    open,
    grievanceMix,
    reportMix,
    signing,
    standing,
    acceptances,
  ] = await Promise.all([
      loadFiledGrievances(window),
      loadClosedGrievances(window),
      loadFiledReports(window),
      loadClosedReports(window),
      countOpenCases(window.to),
      loadGrievanceMix(window.from, window.to),
      loadReportMix(window.from, window.to),
      loadSigning(window),
      loadPolicyStanding(),
      loadAcceptances(window),
    ]);
  const [openGrievances, overdueGrievances, openReports] = open;
  const filed = splitPeriod(filedRows, window, countOf);
  const closed = closedTotals(closedRows, window);
  const reported = splitPeriod(reportRows, window, countOf);
  const reportsClosed = closedTotals(reportClosedRows, window);
  const rising = { higherIsBetter: false };
  const kpis = [
    kpi('leg_grievances_filed', filed.now, filed.before, { ...rising, link: GRIEVANCES }),
    kpi('leg_grievances_resolved', closed.first.now, closed.first.before, { link: GRIEVANCES }),
    kpi('leg_grievances_open', openGrievances, null, { ...rising, link: GRIEVANCES }),
    kpi('leg_grievances_overdue', overdueGrievances, null, { ...rising, link: GRIEVANCES }),
    kpi('leg_grievance_days', closed.days_now, closed.days_before, { ...rising, format: 'DAYS', link: GRIEVANCES }),
    kpi('leg_reports_filed', reported.now, reported.before, { ...rising, link: REPORTS }),
    kpi('leg_reports_open', openReports, null, { ...rising, link: REPORTS }),
    ...signingKpis(signing),
  ];
  // With no policy asked for at signup there is nothing to accept, and 0% would read as a failure.
  if (standing.policies.length > 0) {
    const accepted = standing.accounts - owing(standing.accounts, standing.complete);
    kpis.push(
      kpi('leg_policy_acceptance', pct(accepted, standing.accounts), null, { format: 'PERCENT', link: POLICIES })
    );
  }

  const sections: EntityAnalyticsSections = {
    kpis,
    trends: [
      trend(
        'leg_grievances',
        window,
        [
          { key: 'leg_grievances_filed', values: filed.series },
          { key: 'leg_grievances_resolved', values: closed.first.series },
          { key: 'leg_grievances_rejected', values: closed.second.series },
        ],
        'COUNT',
        GRIEVANCES
      ),
      trend(
        'leg_reports',
        window,
        [
          { key: 'leg_reports_filed', values: reported.series },
          { key: 'leg_reports_actioned', values: reportsClosed.first.series },
          { key: 'leg_reports_dismissed', values: reportsClosed.second.series },
        ],
        'COUNT',
        REPORTS
      ),
      trend(
        'leg_acceptances',
        window,
        [
          { key: 'leg_accepted_at_signup', values: splitPeriod(acceptances, window, (row) => row.signup).series },
          { key: 'leg_accepted_in_account', values: splitPeriod(acceptances, window, (row) => row.account).series },
        ],
        'COUNT',
        ACCEPTANCE_LOG
      ),
    ],
    breakdowns: legalBreakdowns(grievanceMix, reportMix),
    leaderboard: policyLeaderboard(standing.accounts, standing.policies),
  };
  return linkEverything(sections, HOME);
}
