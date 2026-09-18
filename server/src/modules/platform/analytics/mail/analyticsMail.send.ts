import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { logs } from '@observability/log';
import {
  AnalyticsMailSubscriptionModel,
  type AnalyticsMailOutcome,
  type IAnalyticsMailSubscription,
} from './analyticsMail.model';
import { reportCopy, type ReportCopy } from './analyticsMail.copy';
import { buildReport, cachedBoards, type BoardLoader } from './analyticsMail.report';
import { reportHtml } from './analyticsMail.html';
import { analyticsReportPdf } from './analyticsMail.pdf';
import { summarizeReport, type ReportSummary } from './analyticsMail.summary';

/**
 * One analytics report, from the numbers to the inbox: the dashboards the
 * subscriber chose, in their language, as the mail body AND the PDF attached
 * to it, sent through the `analytics-report` template (Tech > Email Templates).
 */

/** What one run shares across its subscribers, so ten of them cost one read of each thing. */
export interface SendContext {
  load: BoardLoader;
  copies: Map<string, Promise<ReportCopy>>;
  /** One AI summary per identical report — same dashboards, period, schedule and language. */
  summaries: Map<string, Promise<ReportSummary | null>>;
  finance: ReturnType<typeof getFinanceSettings>;
}

export const sendContext = (): SendContext => ({
  load: cachedBoards(),
  copies: new Map(),
  summaries: new Map(),
  finance: getFinanceSettings(),
});

function copyFor(ctx: SendContext, locale: string | null): Promise<ReportCopy> {
  const key = locale ?? '';
  const hit = ctx.copies.get(key) ?? reportCopy(locale);
  ctx.copies.set(key, hit);
  return hit;
}

function summaryFor(
  ctx: SendContext,
  sub: IAnalyticsMailSubscription,
  report: Awaited<ReturnType<typeof buildReport>>,
  copy: ReportCopy
): Promise<ReportSummary | null> {
  const key = [sub.pages.join(','), sub.days, sub.frequency, copy.locale].join('|');
  const hit = ctx.summaries.get(key) ?? summarizeReport(report, copy.locale);
  ctx.summaries.set(key, hit);
  return hit;
}

export interface SendOutcome {
  status: AnalyticsMailOutcome;
  reason: string;
}

async function compose(sub: IAnalyticsMailSubscription, ctx: SendContext, now: Date) {
  const locale = await recipientLocale(sub.email);
  const [copy, finance] = await Promise.all([copyFor(ctx, locale), ctx.finance]);
  const titleKey = sub.frequency === 'DAILY' ? 'email.analyticsReport.dailyTitle' : 'email.analyticsReport.weeklyTitle';
  const report = await buildReport({
    title: copy.t(titleKey),
    pages: sub.pages,
    days: sub.days,
    copy,
    currency: finance.currency_symbol,
    load: ctx.load,
    now,
  });
  const summary = sub.ai_summary ? await summaryFor(ctx, sub, report, copy) : null;
  const pdf = await analyticsReportPdf({
    report,
    summary,
    copy,
    recipient: sub.name,
    brandName: finance.business_name,
    logoUrl: finance.invoice_logo_url,
  });
  return { locale, copy, report, summary, pdf };
}

/** Send one subscriber their report now, and write down how it went. Never throws. */
export async function sendAnalyticsReport(
  sub: IAnalyticsMailSubscription,
  ctx: SendContext,
  now = new Date()
): Promise<SendOutcome> {
  let outcome: SendOutcome;
  try {
    const { locale, copy, report, summary, pdf } = await compose(sub, ctx, now);
    const result = await sendEmail({
      to: sub.email,
      subject: `${report.title} — ${report.period}`,
      template: 'analytics-report',
      category: 'internal',
      locale,
      vars: {
        name: sub.name,
        report_title: report.title,
        period_label: report.period,
        dashboards_count: String(report.sections.length),
        analytics_html: reportHtml(report, copy, summary),
        analytics_url: report.url,
      },
      attachments: [
        { filename: `duncit-analytics-${now.toISOString().slice(0, 10)}.pdf`, content: pdf, contentType: 'application/pdf' },
      ],
    });
    if (result.accepted.length > 0) outcome = { status: 'SENT', reason: '' };
    else outcome = { status: result.skipped ? 'SKIPPED' : 'FAILED', reason: result.reason ?? '' };
  } catch (err) {
    logs.server.error('analytics-mail', 'send', { error: err, to: sub.email, msg: 'report failed' });
    outcome = { status: 'FAILED', reason: err instanceof Error ? err.message : String(err) };
  }
  await AnalyticsMailSubscriptionModel.updateOne(
    { _id: sub._id },
    { $set: { last_sent_at: now, last_status: outcome.status, last_error: outcome.reason } }
  ).exec();
  return outcome;
}
