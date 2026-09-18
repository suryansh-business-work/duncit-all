import { escapeHtml } from '@utils/html';
import type { ReportCopy } from './analyticsMail.copy';
import type { AnalyticsReport, ReportKpi, ReportSection } from './analyticsMail.report';
import type { DeltaTone } from './analyticsMail.format';
import type { ReportSummary } from './analyticsMail.summary';

/**
 * The report as the block the `analytics-report` template drops into its body
 * (`{{analytics_html}}`). Variables are substituted into the COMPILED mail, so
 * this is plain HTML with inline styles — what every mail client renders — and
 * every string that came from data is escaped here.
 *
 * Colours meet WCAG AA on white: a rise or fall is also written as a signed
 * number, so the colour is never the only signal.
 */

const TONE_COLOR: Record<DeltaTone, string> = { good: '#15803d', bad: '#b91c1c', flat: '#4b5563' };
const MUTED = '#4b5563';
const LINK = '#b91c1c';
const CELL = 'padding:8px 0;border-bottom:1px solid #e5e7eb;vertical-align:top';

function kpiRow(kpi: ReportKpi): string {
  const color = kpi.tone ? TONE_COLOR[kpi.tone] : MUTED;
  const title = `<td style="${CELL};color:#374151;font-size:14px">${escapeHtml(kpi.title)}</td>`;
  const value = `<div style="font-size:15px;font-weight:700;color:#111827">${escapeHtml(kpi.value)}</div>`;
  const change = `<div style="font-size:12px;color:${color}">${escapeHtml(kpi.change)}</div>`;
  return `<tr>${title}<td align="right" style="${CELL}">${value}${change}</td></tr>`;
}

function sectionBody(section: ReportSection): string {
  if (section.error) {
    return `<p style="margin:0;font-size:13px;color:#b91c1c">${escapeHtml(section.error)}</p>`;
  }
  const rows = section.kpis.map(kpiRow).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>`;
}

function sectionHtml(section: ReportSection, openLabel: string): string {
  const heading = `<p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#111827">${escapeHtml(section.title)}</p>`;
  const link = `<a href="${escapeHtml(section.url)}" style="color:${LINK};font-weight:600">${escapeHtml(openLabel)}</a>`;
  return `<div style="margin:0 0 28px 0">${heading}${sectionBody(section)}<p style="margin:10px 0 0 0;font-size:13px">${link}</p></div>`;
}

/** One labelled list of the summary — omitted when the AI had nothing for it. */
function summaryList(label: string, items: readonly string[]): string {
  if (items.length === 0) return '';
  const lines = items.map((item) => `<li style="margin:0 0 4px 0">${escapeHtml(item)}</li>`).join('');
  return `<p style="margin:12px 0 4px 0;font-size:13px;font-weight:700;color:#111827">${escapeHtml(label)}</p><ul style="margin:0;padding-left:18px;font-size:14px;color:#374151">${lines}</ul>`;
}

/** The AI's reading, above the numbers, marked as AI-written so nobody mistakes it for a figure. */
function summaryHtml(summary: ReportSummary, copy: ReportCopy): string {
  const heading = `<p style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:#111827">${escapeHtml(copy.t('email.analyticsReport.aiHeading'))}</p>`;
  const headline = `<p style="margin:0;font-size:15px;color:#111827">${escapeHtml(summary.headline)}</p>`;
  const lists = [
    summaryList(copy.t('email.analyticsReport.aiHighlights'), summary.highlights),
    summaryList(copy.t('email.analyticsReport.aiConcerns'), summary.concerns),
    summaryList(copy.t('email.analyticsReport.aiWatch'), summary.watch),
  ].join('');
  const note = `<p style="margin:10px 0 0 0;font-size:12px;color:${MUTED}">${escapeHtml(copy.t('email.analyticsReport.aiNote'))}</p>`;
  return `<div style="margin:0 0 28px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb">${heading}${headline}${lists}${note}</div>`;
}

export function reportHtml(report: AnalyticsReport, copy: ReportCopy, summary: ReportSummary | null = null): string {
  const openLabel = copy.t('email.analyticsReport.openDashboard');
  const top = summary ? summaryHtml(summary, copy) : '';
  return top + report.sections.map((section) => sectionHtml(section, openLabel)).join('');
}
