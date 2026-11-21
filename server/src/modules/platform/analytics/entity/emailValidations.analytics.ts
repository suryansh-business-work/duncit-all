import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import {
  checksOf,
  EMAIL_CHECK_KEYS,
  EMAIL_VERDICTS,
} from '@modules/platform/emailValidation/emailValidation.checks';
import { consoleLink } from './links';
import { seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  topSlices,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type AnalyticsTrend,
  type EntityAnalyticsSections,
} from './shapes';
import {
  flagCombos,
  portalRows,
  sourceRows,
  uniqueEmails,
  validationDays,
  type FlagCombo,
  type PortalRow,
  type SourceRow,
  type ValidationDay,
} from './emailValidations.data';

/**
 * Admin › Email Validations › Dashboard — how the addresses staff check across
 * every console turn out: how many are valid, risky or invalid, which tests
 * they fail, and which consoles check the most.
 */

const PAGE = consoleLink('admin', '/email-validations/dashboard');
const LOGS = consoleLink('admin', '/email-validations/logs');

/** A re-run is told apart from a first check, whatever its source. */
const SOURCES = ['SINGLE', 'BULK', 'REVALIDATE'];
const PORTAL_NAMES = new Map(PORTAL_REGISTRY.map((portal) => [portal.key, portal.name]));

const sumOf = (rows: readonly ValidationDay[], valueOf: (row: ValidationDay) => number) => total(rows.map(valueOf));

interface Period {
  days: ValidationDay[];
  unique: number;
}

function figures({ days, unique }: Period) {
  const valid = sumOf(days, (row) => row.valid);
  const risky = sumOf(days, (row) => row.risky);
  const invalid = sumOf(days, (row) => row.invalid);
  const validations = valid + risky + invalid;
  return {
    validations,
    unique,
    valid,
    risky,
    invalid,
    valid_rate: pct(valid, validations),
    revalidations: sumOf(days, (row) => row.revalidations),
    typos: sumOf(days, (row) => row.typos),
  };
}

function validationKpis(current: Period, previous: Period): AnalyticsKpi[] {
  const now = figures(current);
  const before = figures(previous);
  const worse = { higherIsBetter: false, link: LOGS };
  return [
    kpi('ev_validations', now.validations, before.validations, { link: LOGS }),
    kpi('ev_unique_emails', now.unique, before.unique, { link: LOGS }),
    kpi('ev_valid_rate', now.valid_rate, before.valid_rate, { format: 'PERCENT', link: LOGS }),
    kpi('ev_valid', now.valid, before.valid, { link: LOGS }),
    kpi('ev_risky', now.risky, before.risky, worse),
    kpi('ev_invalid', now.invalid, before.invalid, worse),
    kpi('ev_revalidations', now.revalidations, before.revalidations, { link: LOGS }),
    kpi('ev_typos', now.typos, before.typos, worse),
  ];
}

function validationTrends(days: readonly ValidationDay[], window: AnalyticsWindow): AnalyticsTrend[] {
  const daily = (valueOf: (row: ValidationDay) => number) =>
    seriesFromDays(days.map((row) => ({ _id: row._id, value: valueOf(row) })), window);
  return [
    trend('ev_verdicts', window, [
      { key: 'ev_valid', values: daily((row) => row.valid) },
      { key: 'ev_risky', values: daily((row) => row.risky) },
      { key: 'ev_invalid', values: daily((row) => row.invalid) },
    ]),
    trend('ev_activity', window, [
      { key: 'ev_validations', values: daily((row) => row.valid + row.risky + row.invalid) },
      { key: 'ev_revalidations', values: daily((row) => row.revalidations) },
    ]),
  ];
}

/** How often each test failed. A test that could not run is not a failure (see checksOf). */
export function failureCounts(combos: readonly FlagCombo[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const combo of combos) {
    for (const check of checksOf(combo._id)) {
      if (check.passed === false) counts.set(check.key, (counts.get(check.key) ?? 0) + combo.count);
    }
  }
  return counts;
}

export function sourceCounts(rows: readonly SourceRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row._id.revalidation ? 'REVALIDATE' : row._id.source;
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  }
  return counts;
}

const portalTotal = (row: PortalRow) => row.valid + row.risky + row.invalid;

function validationBreakdowns(
  current: Period,
  portals: readonly PortalRow[],
  combos: readonly FlagCombo[],
  sources: readonly SourceRow[]
): AnalyticsBreakdown[] {
  const now = figures(current);
  const verdicts = new Map([
    ['VALID', now.valid],
    ['RISKY', now.risky],
    ['INVALID', now.invalid],
  ]);
  const perPortal = new Map(portals.map((row) => [row._id, portalTotal(row)]));
  return [
    breakdown('ev_by_verdict', fixedSlices(EMAIL_VERDICTS, verdicts), { ordered: true }),
    breakdown('ev_by_portal', topSlices(perPortal, PORTAL_NAMES)),
    breakdown('ev_failed_checks', fixedSlices(EMAIL_CHECK_KEYS, failureCounts(combos)), { ordered: true }),
    breakdown('ev_by_source', fixedSlices(SOURCES, sourceCounts(sources))),
  ];
}

/** Every console that ran a check, busiest first, with how its checks turned out. */
function portalLeaderboard(portals: readonly PortalRow[]): AnalyticsLeaderboard {
  return {
    key: 'ev_top_portals',
    columns: [
      { key: 'ev_validations', format: 'COUNT' },
      { key: 'ev_valid', format: 'COUNT' },
      { key: 'ev_risky', format: 'COUNT' },
      { key: 'ev_invalid', format: 'COUNT' },
      { key: 'ev_valid_rate', format: 'PERCENT' },
    ],
    link: LOGS,
    rows: [...portals]
      .sort((a, b) => portalTotal(b) - portalTotal(a) || a._id.localeCompare(b._id))
      .slice(0, 10)
      .map((row) => ({
        id: row._id,
        name: PORTAL_NAMES.get(row._id) ?? row._id,
        caption: null,
        link: LOGS,
        values: [portalTotal(row), row.valid, row.risky, row.invalid, pct(row.valid, portalTotal(row))],
      })),
  };
}

export async function emailValidationsAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [days, prevDays, unique, prevUnique, portals, combos, sources] = await Promise.all([
    validationDays(window.from, window.to, window.zone),
    validationDays(window.prevFrom, window.prevTo, window.zone),
    uniqueEmails(window.from, window.to),
    uniqueEmails(window.prevFrom, window.prevTo),
    portalRows(window.from, window.to),
    flagCombos(window.from, window.to),
    sourceRows(window.from, window.to),
  ]);
  const current = { days, unique };
  return linkEverything(
    {
      kpis: validationKpis(current, { days: prevDays, unique: prevUnique }),
      trends: validationTrends(days, window),
      breakdowns: validationBreakdowns(current, portals, combos, sources),
      leaderboard: portalLeaderboard(portals),
    },
    PAGE
  );
}
