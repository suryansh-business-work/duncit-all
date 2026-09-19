import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { WaCampaignModel } from '@modules/crm/marketing/waCampaign.model';
import {
  WA_CONNECTION_TEST_EVENT_KEY,
  WA_MANUAL_EVENT_KEY,
  WA_OTP_EVENT_KEY,
} from '@modules/platform/whatsapp/whatsapp.manualLog';
import { inRange, type AnalyticsWindow } from './window';
import { perDay, type PeriodDayKey } from './aggregates';

/**
 * What the WhatsApp costing page reads. A message is billed once it is SENT,
 * at the rate it froze when it went out — never the rate card as it is today.
 *
 * Automatic, test and one-time-code messages are one `WaMessageLog` row each;
 * a marketing campaign is one `WaCampaign` row carrying its own counts, dated
 * by creation as the Communications page and Marketing's dashboard date it.
 */

const RATE = { $ifNull: ['$msg_rate', 0] };
const SENT_COUNT = { $ifNull: ['$sent_count', 0] };
const CAMPAIGN_SPEND = { $multiply: [RATE, SENT_COUNT] };
const SENT = { status: 'SENT' };

/** Where a logged message came from — the funnel's scenarios, a one-time code, or a person's test. */
const LOG_SOURCE = {
  $switch: {
    branches: [
      { case: { $eq: ['$event_key', WA_OTP_EVENT_KEY] }, then: 'OTP' },
      { case: { $in: ['$event_key', [WA_MANUAL_EVENT_KEY, WA_CONNECTION_TEST_EVENT_KEY]] }, then: 'TESTS' },
    ],
    default: 'AUTOMATIC',
  },
};

export interface WaCostDayRow {
  _id: PeriodDayKey;
  messages: number;
  spend: number;
  /** Messages that went out at a zero rate — a free category, or one AiSensy never reported. */
  zero_rate: number;
  /** Campaigns that sent at least one message; always 0 on the log's rows. */
  campaigns: number;
}

/** Logged messages per day, in both periods. */
export const loadLogDays = (window: AnalyticsWindow) =>
  WaMessageLogModel.aggregate<WaCostDayRow>([
    { $match: SENT },
    ...perDay('created_at', window, {
      messages: { $sum: 1 },
      spend: { $sum: RATE },
      zero_rate: { $sum: { $cond: [{ $gt: [RATE, 0] }, 0, 1] } },
      campaigns: { $sum: 0 },
    }),
  ]);

/** Campaign messages per day, in both periods. */
export const loadCampaignDays = (window: AnalyticsWindow) =>
  WaCampaignModel.aggregate<WaCostDayRow>(
    perDay('created_at', window, {
      messages: { $sum: SENT_COUNT },
      spend: { $sum: CAMPAIGN_SPEND },
      zero_rate: { $sum: { $cond: [{ $gt: [RATE, 0] }, 0, SENT_COUNT] } },
      campaigns: { $sum: { $cond: [{ $gt: [SENT_COUNT, 0] }, 1, 0] } },
    })
  );

/** Messages and spend under one key — a template category, a source. */
export interface WaCostSplit {
  _id: string | null;
  messages: number;
  spend: number;
}

/** One thing the money went on: an automatic scenario or a campaign. */
export interface WaCostItem {
  _id: string;
  name: string;
  category: string | null;
  messages: number;
  spend: number;
}

const COST_SUMS = { messages: { $sum: 1 }, spend: { $sum: RATE } };

/**
 * The period's logged messages by template category, by source and by
 * scenario, and every campaign that sent something — campaigns are few enough
 * to fold into the same splits in memory.
 */
export async function loadWaCostMix(from: Date, to: Date) {
  const [[log], campaigns] = await Promise.all([
    WaMessageLogModel.aggregate<{ categories: WaCostSplit[]; sources: WaCostSplit[]; items: WaCostItem[] }>([
      { $match: { ...SENT, created_at: inRange(from, to) } },
      // Oldest first, so `$last` below is the campaign and category as the newest message had them.
      { $sort: { created_at: 1 } },
      {
        $facet: {
          categories: [{ $group: { _id: '$template_category', ...COST_SUMS } }],
          sources: [{ $group: { _id: LOG_SOURCE, ...COST_SUMS } }],
          items: [
            {
              $group: {
                _id: '$event_key',
                name: { $last: '$campaign' },
                category: { $last: '$template_category' },
                ...COST_SUMS,
              },
            },
          ],
        },
      },
    ]),
    WaCampaignModel.aggregate<WaCostItem>([
      { $match: { created_at: inRange(from, to), sent_count: { $gt: 0 } } },
      {
        $project: {
          name: '$name',
          category: '$template_category',
          messages: SENT_COUNT,
          spend: CAMPAIGN_SPEND,
        },
      },
    ]),
  ]);
  return { ...log, campaigns };
}
