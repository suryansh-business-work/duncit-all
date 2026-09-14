import type { Translate } from '@duncit/shell';
import { formatDateTime } from '../../../server/format';
import type { StressRun, StressSample, StressSummary, StressVerdict, StressVerdictItem } from '../../queries';
import {
  environmentLabel,
  formatCount,
  formatMs,
  formatPct,
  formatRps,
  formatSeconds,
  gradeLabel,
  journeyLabel,
  levelLabel,
  statusLabel,
} from '../../labels';

/**
 * A finished run as ONE self-contained HTML file — the plan, the results, the
 * AI verdict, every page and query, the time series and the log — so it can be
 * mailed, attached to a ticket or printed to PDF without portal access.
 *
 * Every word comes from the same translation keys the page renders, and every
 * value is escaped: endpoint keys, log lines and the verdict are data a runner
 * or a model wrote.
 */

/** The time series table is folded to this many rows — a 30-minute run is 360 samples. */
const SERIES_ROWS = 60;

type Row = readonly string[];

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (value: string) => value.replaceAll(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);

const tag = (name: string, content: string, className = '') =>
  ['<', name, className ? ' class="' + className + '"' : '', '>', content, '</', name, '>'].join('');

const text = (name: string, value: string, className = '') => tag(name, escapeHtml(value), className);

function table(head: Row, rows: readonly Row[]): string {
  const headRow = tag('tr', head.map((cell) => text('th', cell)).join(''));
  const body = rows.map((row) => tag('tr', row.map((cell) => text('td', cell)).join(''))).join('');
  return tag('table', tag('thead', headRow) + tag('tbody', body));
}

/** Label / value pairs as a two-column table. */
const facts = (pairs: readonly Row[]) => tag('table', tag('tbody', pairs.map(([label, value]) => tag('tr', text('th', label) + text('td', value))).join('')), 'facts');

const section = (title: string, content: string) => tag('section', text('h2', title) + content);

function verdictItems(t: Translate, title: string, items: readonly StressVerdictItem[]): string {
  const rows = items.map((item) => [levelLabel(t, item.level), item.title, item.detail]);
  return text('h3', title) + (rows.length > 0 ? table([t('tech.stress.reportLevel'), t('tech.stress.reportFinding'), t('tech.stress.reportDetail')], rows) : text('p', t('tech.stress.verdictNoneFound')));
}

function verdictSection(t: Translate, verdict: StressVerdict | null): string {
  if (!verdict) return section(t('tech.stress.verdictTitle'), text('p', t('tech.stress.reportNoVerdict')));
  const breakingPoint = verdict.breaking_point_users > 0 ? formatCount(verdict.breaking_point_users) : t('tech.stress.verdictNotReached');
  const watch = verdict.watch_points.map((point) => text('li', point)).join('');
  return section(
    t('tech.stress.verdictTitle'),
    [
      text('p', gradeLabel(t, verdict.grade) + ' · ' + verdict.headline, 'lead'),
      facts([
        [t('tech.stress.verdictSafeUsers'), formatCount(verdict.safe_concurrent_users)],
        [t('tech.stress.verdictBreakingPoint'), breakingPoint],
        [t('tech.stress.verdictConfidence'), levelLabel(t, verdict.confidence)],
      ]),
      text('p', t('tech.stress.verdictUsersHint'), 'muted'),
      text('h3', t('tech.stress.verdictReasoning')),
      text('p', verdict.capacity_reasoning),
      verdictItems(t, t('tech.stress.verdictBottlenecks'), verdict.bottlenecks),
      verdictItems(t, t('tech.stress.verdictUpgrades'), verdict.upgrades),
      watch ? text('h3', t('tech.stress.verdictWatch')) + tag('ul', watch) : '',
      text('p', t('tech.stress.verdictGenerated', { vars: { by: verdict.generated_by, at: formatDateTime(verdict.generated_at), model: verdict.model } }), 'muted'),
    ].join('')
  );
}

const orDash = (sum: StressSummary | null, pick: (s: StressSummary) => string) => (sum ? pick(sum) : '—');

function seriesRows(samples: readonly StressSample[], startedAt: string | null): Row[] {
  const step = Math.max(1, Math.ceil(samples.length / SERIES_ROWS));
  const start = startedAt ? Date.parse(startedAt) : Date.parse(samples[0]?.at ?? '');
  return samples
    .filter((_, i) => i % step === 0)
    .map((s) => [
      formatSeconds((Date.parse(s.at) - start) / 1000),
      formatCount(s.load.active_vus),
      formatRps(s.load.rps),
      formatMs(s.load.p95_ms),
      formatPct(s.load.error_rate_pct),
      formatPct(s.server.host_cpu_pct),
      formatPct(s.server.host_memory_pct),
      formatMs(s.server.event_loop_lag_ms),
    ]);
}

const STYLE = [
  'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;margin:32px auto;max-width:1040px;padding:0 16px;line-height:1.45}',
  'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:2px solid #D92D2D;padding-bottom:4px}h3{margin:16px 0 6px}',
  'table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}',
  'thead th{background:#f4f4f4}.facts th{width:32%;background:#fafafa}.lead{font-size:18px;font-weight:600}.muted{color:#555;font-size:12px}',
  '@media print{body{margin:0}section{break-inside:avoid-page}}',
].join('');

/** The whole report, ready for `downloadTextFile`. */
export function buildRunReport(t: Translate, run: StressRun, samples: readonly StressSample[]): string {
  const p = run.profile;
  const sum = run.summary;
  const endReason = run.stop_reason || run.error_message || t('tech.stress.reportPlanCompleted');
  const overview = facts([
    [t('tech.stress.colStatus'), statusLabel(t, run.status)],
    [t('tech.stress.colEnvironment'), environmentLabel(t, run.environment)],
    [t('tech.stress.reportTargets'), t('tech.stress.runTargets', { vars: { mweb: run.target_mweb_url, api: run.target_graphql_url, by: run.triggered_by } })],
    [t('tech.stress.startedAt'), formatDateTime(run.started_at)],
    [t('tech.stress.endedAt'), formatDateTime(run.ended_at)],
    [t('tech.stress.colDuration'), formatSeconds(run.duration_seconds)],
    [t('tech.stress.colStopReason'), endReason],
  ]);
  const plan = facts([
    [t('tech.stress.fUsers'), String(p.virtual_users)],
    [t('tech.stress.fBots'), String(p.browser_bots)],
    [t('tech.stress.fRunners'), String(p.runners)],
    [t('tech.stress.fRampUp'), formatSeconds(p.ramp_up_seconds)],
    [t('tech.stress.fHold'), formatSeconds(p.hold_seconds)],
    [t('tech.stress.fRampDown'), formatSeconds(p.ramp_down_seconds)],
    [t('tech.stress.fThink'), formatMs(p.think_time_ms)],
    [t('tech.stress.journeysLabel'), p.journeys.map((j) => journeyLabel(t, j)).join(', ')],
  ]);
  // A run closed on silent runners has no summary; its peaks still say something.
  const results = facts([
    [t('tech.stress.kpiRequests'), orDash(sum, (s) => formatCount(s.requests))],
    [t('tech.stress.kpiErrorRate'), formatPct(sum?.error_rate_pct ?? run.peaks.error_rate_pct)],
    [t('tech.stress.kpiP50'), orDash(sum, (s) => formatMs(s.p50_ms))],
    [t('tech.stress.kpiP95'), formatMs(sum?.p95_ms ?? run.peaks.p95_ms)],
    [t('tech.stress.kpiP99'), orDash(sum, (s) => formatMs(s.p99_ms))],
    [t('tech.stress.kpiPageLoad'), orDash(sum, (s) => formatMs(s.avg_page_load_ms))],
    [t('tech.stress.kpiPeakUsers'), formatCount(run.peaks.virtual_users)],
    [t('tech.stress.colPeakRps'), formatRps(run.peaks.rps)],
    [t('tech.stress.kpiPeakCpu'), formatPct(run.peaks.host_cpu_pct)],
    [t('tech.stress.reportPeakMemory'), formatPct(run.peaks.host_memory_pct)],
    [t('tech.stress.kpiEventLoop'), formatMs(run.peaks.event_loop_lag_ms)],
    [t('tech.stress.kpiRealUsers'), formatCount(run.peaks.real_users)],
  ]);
  const endpoints = table(
    [t('tech.stress.colEndpoint'), t('tech.stress.colRequests'), t('tech.stress.colErrors'), t('tech.stress.colAvg'), t('tech.stress.colP50'), t('tech.stress.colP95'), t('tech.stress.colP99')],
    run.endpoints.map((e) => [e.key, formatCount(e.requests), formatCount(e.errors), formatMs(e.avg_ms), formatMs(e.p50_ms), formatMs(e.p95_ms), formatMs(e.p99_ms)])
  );
  const series = table(
    [t('tech.stress.kpiElapsed'), t('tech.stress.seriesVirtualUsers'), t('tech.stress.seriesBotRps'), t('tech.stress.seriesP95'), t('tech.stress.seriesErrorRate'), t('tech.stress.seriesCpu'), t('tech.stress.seriesMemory'), t('tech.stress.seriesEventLoop')],
    seriesRows(samples, run.started_at)
  );
  const log = table(
    [t('tech.stress.colSeen'), t('tech.stress.reportLevel'), t('tech.stress.reportSource'), t('tech.stress.reportMessage')],
    run.events.map((e) => [formatDateTime(e.at), e.level, e.source, e.message])
  );
  const title = t('tech.stress.reportTitle', { vars: { run: run.run_no } });

  return [
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    text('title', title),
    tag('style', STYLE),
    '</head><body>',
    text('h1', title),
    text('p', t('tech.stress.reportGeneratedAt', { vars: { at: formatDateTime(new Date().toISOString()) } }), 'muted'),
    section(t('tech.stress.reportOverview'), overview),
    verdictSection(t, run.verdict),
    section(t('tech.stress.profileTitle'), plan),
    section(t('tech.stress.reportResults'), results),
    section(t('tech.stress.endpointsTitle'), run.endpoints.length > 0 ? endpoints : text('p', t('tech.stress.endpointsEmpty'))),
    section(t('tech.stress.reportTimeSeries'), samples.length > 0 ? series : text('p', t('tech.stress.chartEmpty'))),
    section(t('tech.stress.logTitle'), log),
    '</body></html>',
  ].join('');
}
