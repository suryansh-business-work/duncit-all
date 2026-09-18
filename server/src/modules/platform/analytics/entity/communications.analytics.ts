import { toTemplateCategory, WA_TEMPLATE_CATEGORIES } from '@modules/crm/marketing/waPricing.model';
import { consoleLink } from './links';
import { refKey } from './lookups';
import { sumBy } from './aggregates';
import { seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  countMap,
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
  emailSplits,
  loadCommsPeriod,
  notificationScopes,
  topTemplates,
  whatsappSplits,
  type CommsPeriod,
  type TemplateRow,
} from './communications.data';

/**
 * Analytics > Communications — whether what Duncit sends actually goes out:
 * emails sent, failed and skipped, WhatsApp messages and what they cost,
 * notifications and the pushes behind them, and the CRM's own outreach.
 */

const PAGE = consoleLink('communications', '/');
const EMAILS = consoleLink('communications', '/emails/dashboard');
const LOGS = consoleLink('communications', '/emails/logs');
const WHATSAPP = consoleLink('communications', '/whatsapp');
const NOTIFICATIONS = consoleLink('marketing', '/notifications');

/** Email Logs, already narrowed to one status — the same filter its status chips apply. */
const logsWith = (status: string) => consoleLink('communications', `/emails/logs?status=${status}`);

const SCOPES = ['GLOBAL', 'LOCATION', 'ZONE', 'USER', 'AUDIENCE_LIST'] as const;
// A message whose category AiSensy never reported is filed under "not set".
const WA_CATEGORIES = [...WA_TEMPLATE_CATEGORIES, 'none'];
/** Slices whose words come from the copy bundle, not from the data. */
const UNNAMED = new Map<string, string>();

const sumOf = <T>(rows: readonly T[], valueOf: (row: T) => number) => total(rows.map(valueOf));

/** Each tile's value for one period — computed identically for both periods. */
function commsFigures(period: CommsPeriod) {
  const emailsSent = sumOf(period.emails, (row) => row.sent);
  const emailsFailed = sumOf(period.emails, (row) => row.failed);
  const whatsappSent = sumOf(period.whatsapp, (row) => row.sent);
  const whatsappFailed = sumOf(period.whatsapp, (row) => row.failed);
  return {
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
    emails_skipped: sumOf(period.emails, (row) => row.skipped),
    // A skipped email was never attempted, so it is left out of the rate.
    email_delivery_rate: pct(emailsSent, emailsSent + emailsFailed),
    whatsapp_sent: whatsappSent,
    whatsapp_failed: whatsappFailed,
    whatsapp_cost: Math.round(sumOf(period.whatsapp, (row) => row.cost) * 100) / 100,
    whatsapp_delivery_rate: pct(whatsappSent, whatsappSent + whatsappFailed),
    notifications: sumOf(period.notifications, (row) => row.created),
    push_delivered: sumOf(period.notifications, (row) => row.delivered),
    push_failed: sumOf(period.notifications, (row) => row.failed),
    crm: period.crm,
  };
}

function commsKpis(current: CommsPeriod, previous: CommsPeriod): AnalyticsKpi[] {
  const now = commsFigures(current);
  const before = commsFigures(previous);
  const worse = { higherIsBetter: false };
  return [
    kpi('com_emails_sent', now.emails_sent, before.emails_sent, { link: LOGS }),
    kpi('com_emails_failed', now.emails_failed, before.emails_failed, { ...worse, link: logsWith('FAILED') }),
    kpi('com_emails_skipped', now.emails_skipped, before.emails_skipped, { ...worse, link: logsWith('SKIPPED') }),
    kpi('com_email_delivery_rate', now.email_delivery_rate, before.email_delivery_rate, {
      format: 'PERCENT',
      link: EMAILS,
    }),
    kpi('com_whatsapp_sent', now.whatsapp_sent, before.whatsapp_sent, { link: WHATSAPP }),
    kpi('com_whatsapp_failed', now.whatsapp_failed, before.whatsapp_failed, { ...worse, link: WHATSAPP }),
    kpi('com_whatsapp_cost', now.whatsapp_cost, before.whatsapp_cost, {
      ...worse,
      format: 'CURRENCY',
      link: WHATSAPP,
    }),
    kpi('com_whatsapp_delivery_rate', now.whatsapp_delivery_rate, before.whatsapp_delivery_rate, {
      format: 'PERCENT',
      link: WHATSAPP,
    }),
    kpi('com_notifications', now.notifications, before.notifications, { link: NOTIFICATIONS }),
    kpi('com_push_delivered', now.push_delivered, before.push_delivered, { link: NOTIFICATIONS }),
    kpi('com_push_failed', now.push_failed, before.push_failed, { ...worse, link: NOTIFICATIONS }),
    kpi('com_crm_outreach', now.crm, before.crm, { link: consoleLink('crm', '/') }),
  ];
}

function commsTrends(period: CommsPeriod, window: AnalyticsWindow): AnalyticsTrend[] {
  const daily = <T extends { _id: string }>(rows: readonly T[], valueOf: (row: T) => number) =>
    seriesFromDays(rows.map((row) => ({ _id: row._id, value: valueOf(row) })), window);
  const emails = [
    { key: 'com_emails_sent', values: daily(period.emails, (row) => row.sent) },
    { key: 'com_emails_failed', values: daily(period.emails, (row) => row.failed) },
    { key: 'com_emails_skipped', values: daily(period.emails, (row) => row.skipped) },
  ];
  const whatsapp = [
    { key: 'com_whatsapp_sent', values: daily(period.whatsapp, (row) => row.sent) },
    { key: 'com_whatsapp_failed', values: daily(period.whatsapp, (row) => row.failed) },
    { key: 'com_whatsapp_skipped', values: daily(period.whatsapp, (row) => row.skipped) },
  ];
  const notifications = [
    { key: 'com_notifications', values: daily(period.notifications, (row) => row.created) },
    { key: 'com_push_delivered', values: daily(period.notifications, (row) => row.delivered) },
    { key: 'com_push_failed', values: daily(period.notifications, (row) => row.failed) },
  ];
  return [
    trend('com_emails', window, emails, 'COUNT', LOGS),
    trend('com_whatsapp', window, whatsapp, 'COUNT', WHATSAPP),
    trend('com_notifications', window, notifications, 'COUNT', NOTIFICATIONS),
  ];
}

async function commsBreakdowns(window: AnalyticsWindow): Promise<AnalyticsBreakdown[]> {
  const [[emails], whatsapp, scopes] = await Promise.all([
    emailSplits(window.from, window.to),
    whatsappSplits(window.from, window.to),
    notificationScopes(window.from, window.to),
  ]);
  const categories = sumBy(whatsapp, (row) => toTemplateCategory(row._id.category) ?? 'none', (row) => row.count);
  const campaigns = sumBy(whatsapp, (row) => refKey(row._id.campaign), (row) => row.count);
  // A campaign is named by itself; one with no name reads "not set".
  const named = [...campaigns.keys()].filter((name) => name !== 'none');
  const campaignNames = new Map(named.map((name) => [name, name]));
  return [
    breakdown('com_emails_by_category', topSlices(countMap(emails.categories), UNNAMED), { link: LOGS }),
    breakdown('com_emails_by_source', topSlices(countMap(emails.sources), UNNAMED), { link: LOGS }),
    breakdown('com_whatsapp_by_category', fixedSlices(WA_CATEGORIES, categories), { link: WHATSAPP }),
    breakdown('com_whatsapp_by_campaign', topSlices(campaigns, campaignNames), { link: WHATSAPP }),
    breakdown('com_notifications_by_scope', fixedSlices(SCOPES, countMap(scopes)), { link: NOTIFICATIONS }),
  ];
}

/** The ten templates that tried to send the most email, with how those sends went. */
function templateLeaderboard(rows: readonly TemplateRow[]): AnalyticsLeaderboard {
  return {
    key: 'com_top_templates',
    columns: [
      { key: 'com_emails_sent', format: 'COUNT' },
      { key: 'com_emails_failed', format: 'COUNT' },
      { key: 'com_emails_skipped', format: 'COUNT' },
      { key: 'com_email_delivery_rate', format: 'PERCENT' },
      { key: 'com_send_time', format: 'DURATION' },
    ],
    link: consoleLink('communications', '/emails/templates'),
    rows: rows.map((row) => {
      const attempted = row.sent + row.failed;
      const rate = attempted > 0 ? pct(row.sent, attempted) : null;
      const sendTime = row.duration === null ? null : Math.round(row.duration);
      return {
        id: row._id,
        name: row._id,
        caption: null,
        link: consoleLink('communications', `/emails/logs?template=${encodeURIComponent(row._id)}`),
        values: [row.sent, row.failed, row.skipped, rate, sendTime],
      };
    }),
  };
}

export async function communicationsAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, breakdowns, templates] = await Promise.all([
    loadCommsPeriod(window.from, window.to, window.zone),
    loadCommsPeriod(window.prevFrom, window.prevTo, window.zone),
    commsBreakdowns(window),
    topTemplates(window.from, window.to),
  ]);
  return linkEverything(
    {
      kpis: commsKpis(current, previous),
      trends: commsTrends(current, window),
      breakdowns,
      leaderboard: templateLeaderboard(templates),
    },
    PAGE
  );
}
