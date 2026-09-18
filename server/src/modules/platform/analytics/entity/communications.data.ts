import { EmailLogModel } from '@modules/content/emailLog/emailLog.model';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { WaCampaignModel } from '@modules/crm/marketing/waCampaign.model';
import { NotificationModel } from '@modules/engagement/notification/notification.model';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { dayKeyExpr, inRange } from './window';

/**
 * Everything the Communications analytics page reads: the emails, WhatsApp
 * messages and notifications Duncit sent, and what became of each. Every
 * number comes from the log its own console lists, so a figure here and the
 * rows behind it agree.
 *
 * One-time codes are deliberately absent. A code's challenge row is dropped an
 * hour after it expires (the OTP model's TTL index) and MSG91 keeps its own
 * logs, so the database holds no history of codes to count.
 */

/** Rows with `status`, summed inside a `$group` — 1 each, or `value` each. */
const when = (status: string, value: unknown = 1) => ({
  $sum: { $cond: [{ $eq: ['$status', status] }, value, 0] },
});

export interface SendDay {
  _id: string;
  sent: number;
  failed: number;
  skipped: number;
}

export interface WhatsappDay extends SendDay {
  /** Rupees: the rate frozen on each message, for the ones that went out. */
  cost: number;
}

export interface NotifyDay {
  _id: string;
  created: number;
  delivered: number;
  failed: number;
}

export interface CommsPeriod {
  emails: SendDay[];
  /** Both WhatsApp logs, one row per day per log — the series sum them per bucket. */
  whatsapp: WhatsappDay[];
  notifications: NotifyDay[];
  crm: number;
}

const emailDays = (from: Date, to: Date, zone: string) =>
  EmailLogModel.aggregate<SendDay>([
    { $match: { created_at: inRange(from, to) } },
    {
      $group: {
        _id: dayKeyExpr('created_at', zone),
        sent: when('SENT'),
        failed: when('FAILED'),
        skipped: when('SKIPPED'),
      },
    },
  ]);

/** Messages the platform sent by itself, one log row per message. */
const automaticDays = (from: Date, to: Date, zone: string) =>
  WaMessageLogModel.aggregate<WhatsappDay>([
    { $match: { created_at: inRange(from, to) } },
    {
      $group: {
        _id: dayKeyExpr('created_at', zone),
        sent: when('SENT'),
        failed: when('FAILED'),
        skipped: when('SKIPPED'),
        cost: when('SENT', { $ifNull: ['$msg_rate', 0] }),
      },
    },
  ]);

/** Marketing sends, one row per campaign carrying its own counts — dated, like the WhatsApp log, by creation. */
const campaignDays = (from: Date, to: Date, zone: string) =>
  WaCampaignModel.aggregate<WhatsappDay>([
    { $match: { created_at: inRange(from, to) } },
    {
      $group: {
        _id: dayKeyExpr('created_at', zone),
        sent: { $sum: '$sent_count' },
        failed: { $sum: '$failed_count' },
        skipped: { $sum: '$skipped_count' },
        cost: { $sum: { $multiply: [{ $ifNull: ['$msg_rate', 0] }, '$sent_count'] } },
      },
    },
  ]);

const notificationDays = (from: Date, to: Date, zone: string) =>
  NotificationModel.aggregate<NotifyDay>([
    { $match: { created_at: inRange(from, to) } },
    {
      $group: {
        _id: dayKeyExpr('created_at', zone),
        created: { $sum: 1 },
        delivered: { $sum: { $ifNull: ['$delivered_count', 0] } },
        failed: { $sum: { $ifNull: ['$failed_count', 0] } },
      },
    },
  ]);

/** Everything the page reads for ONE period — loaded for the chosen period and the one before. */
export async function loadCommsPeriod(from: Date, to: Date, zone: string): Promise<CommsPeriod> {
  const [emails, automatic, campaigns, notifications, crm] = await Promise.all([
    emailDays(from, to, zone),
    automaticDays(from, to, zone),
    campaignDays(from, to, zone),
    notificationDays(from, to, zone),
    CommunicationLogModel.countDocuments({ created_at: inRange(from, to) }),
  ]);
  return { emails, whatsapp: [...automatic, ...campaigns], notifications, crm };
}

export interface KeyCount {
  _id: string | null;
  count: number;
}

/** Emails that went out in the period, by category and by the surface that caused them. */
export const emailSplits = (from: Date, to: Date) =>
  EmailLogModel.aggregate<{ categories: KeyCount[]; sources: KeyCount[] }>([
    { $match: { created_at: inRange(from, to), status: 'SENT' } },
    {
      $facet: {
        categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        sources: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
      },
    },
  ]);

export interface WhatsappSplit {
  _id: { category: string | null; campaign: string | null };
  count: number;
}

/** WhatsApp messages that went out, from both logs, by template category and campaign. */
export async function whatsappSplits(from: Date, to: Date): Promise<WhatsappSplit[]> {
  const [automatic, campaigns] = await Promise.all([
    WaMessageLogModel.aggregate<WhatsappSplit>([
      { $match: { created_at: inRange(from, to), status: 'SENT' } },
      { $group: { _id: { category: '$template_category', campaign: '$campaign' }, count: { $sum: 1 } } },
    ]),
    WaCampaignModel.aggregate<WhatsappSplit>([
      { $match: { created_at: inRange(from, to) } },
      { $group: { _id: { category: '$template_category', campaign: '$wa_campaign_name' }, count: { $sum: '$sent_count' } } },
    ]),
  ]);
  return [...automatic, ...campaigns];
}

export const notificationScopes = (from: Date, to: Date) =>
  NotificationModel.aggregate<KeyCount>([
    { $match: { created_at: inRange(from, to) } },
    { $group: { _id: '$scope', count: { $sum: 1 } } },
  ]);

export interface TemplateRow {
  _id: string;
  sent: number;
  failed: number;
  skipped: number;
  /** Mean milliseconds the provider took on the sends that went out; null when none did. */
  duration: number | null;
}

/** The ten templates that tried to send the most email in the period. Raw-HTML sends name no template. */
export const topTemplates = (from: Date, to: Date) =>
  EmailLogModel.aggregate<TemplateRow>([
    { $match: { created_at: inRange(from, to), template: { $ne: '' } } },
    {
      $group: {
        _id: '$template',
        attempts: { $sum: 1 },
        sent: when('SENT'),
        failed: when('FAILED'),
        skipped: when('SKIPPED'),
        duration: { $avg: { $cond: [{ $eq: ['$status', 'SENT'] }, '$duration_ms', null] } },
      },
    },
    { $sort: { attempts: -1, _id: 1 } },
    { $limit: 10 },
  ]);
