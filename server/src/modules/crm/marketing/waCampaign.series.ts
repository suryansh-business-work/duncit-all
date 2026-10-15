import crypto from 'node:crypto';
import { WaCampaignModel, type WaCampaignDoc } from './waCampaign.model';
import { WaCampaignRecipientModel } from './waCampaignRecipient.model';

/**
 * Recurring campaigns — the lifecycle journeys.
 *
 * A campaign sent to an audience LIST can repeat every N days. The list is
 * re-resolved on every run, so a list like "joined 3-10 days ago, never
 * booked" or "last booked 30-60 days ago" becomes a journey that keeps
 * reaching whoever newly fits it: a first-pod nudge, a win-back, a rebook.
 *
 * Every run of one series is its own campaign row (its own counts, cost and
 * recipients in the console) carrying the same `series_id`. A person reached
 * by any earlier run of the series is skipped, so a journey speaks to each
 * person ONCE however long they stay on the list. Cancelling the scheduled
 * next run ends the series.
 */

const DAY_MS = 24 * 60 * 60_000;

/** Why somebody was skipped on a later run of a series. */
export const SERIES_SEEN_REASON = 'Already received an earlier run of this recurring campaign';

/** The numbers an earlier run of this series already reached. Empty for a one-off. */
export async function seriesSeen(doc: { series_id?: string | null; campaign_id: string }): Promise<Set<string>> {
  if (!doc.series_id) return new Set();
  const earlier = await WaCampaignModel.distinct('campaign_id', {
    series_id: doc.series_id,
    campaign_id: { $ne: doc.campaign_id },
  });
  if (earlier.length === 0) return new Set();
  const reached = await WaCampaignRecipientModel.distinct('destination', {
    campaign_id: { $in: earlier },
    status: 'SENT',
  });
  return new Set(reached.map(String));
}

/**
 * Book the next run of a recurring campaign once this one has finished — the
 * same template, list and values, `repeat_every_days` after now. Returns the
 * new row for the caller to arm, or null for a one-off or a cancelled series.
 */
export async function scheduleNextInSeries(doc: WaCampaignDoc) {
  const every = Number(doc.repeat_every_days ?? 0);
  if (!(every > 0) || !doc.series_id || doc.status === 'CANCELLED') return null;
  return WaCampaignModel.create({
    campaign_id: crypto.randomUUID(),
    series_id: doc.series_id,
    repeat_every_days: every,
    name: doc.name,
    wa_campaign_name: doc.wa_campaign_name,
    audience: doc.audience,
    audience_list_id: doc.audience_list_id,
    user_ids: doc.user_ids,
    contacts: doc.contacts,
    template_name: doc.template_name,
    template_category: doc.template_category,
    msg_rate: doc.msg_rate,
    template_params: doc.template_params,
    media: doc.media,
    buttons: doc.buttons,
    status: 'SCHEDULED',
    scheduled_at: new Date(Date.now() + every * DAY_MS),
    created_by: doc.created_by ?? null,
  });
}
