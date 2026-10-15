import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { WaCampaignRecipientModel } from './waCampaignRecipient.model';
import { getWaPricing } from './waPricing.model';

const WEEK_MS = 7 * 24 * 60 * 60_000;

/** Why a number was skipped for being over the weekly marketing cap. */
export const CAPPED_REASON = 'Weekly marketing message limit reached';

/**
 * Marketing messages this number was sent in the last 7 days: every campaign
 * send, plus the automatic marketing scenarios (a venue's new event, a contact
 * invite, an unfinished-booking nudge). One person's phone is the unit, so it
 * is counted by number, which also covers a manual-numbers send.
 */
async function marketingSentThisWeek(destination: string): Promise<number> {
  const since = new Date(Date.now() - WEEK_MS);
  const [campaigns, automatic] = await Promise.all([
    WaCampaignRecipientModel.countDocuments({ destination, status: 'SENT', created_at: { $gte: since } }),
    WaMessageLogModel.countDocuments({ destination, category: 'marketing', status: 'SENT', created_at: { $gte: since } }),
  ]);
  return campaigns + automatic;
}

/** The saved cap (Communications > WhatsApp > Settings); 0 is no cap. */
export async function marketingWeeklyCap(): Promise<number> {
  return Number((await getWaPricing()).marketing_weekly_cap ?? 0);
}

/**
 * True when one more marketing message would take this number past the cap.
 * Too many promotions to one phone is how a number gets reported and the
 * WhatsApp account rated down, so past the cap the person is skipped this time.
 */
export async function overMarketingCap(destination: string, cap: number): Promise<boolean> {
  if (cap <= 0) return false;
  return (await marketingSentThisWeek(destination)) >= cap;
}
