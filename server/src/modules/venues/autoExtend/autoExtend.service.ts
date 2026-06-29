import { VenueModel, type IVenue } from '@modules/venues/venue/venue.model';
import { SlotTemplateModel, type ISlotTemplate } from '@modules/venues/slotTemplate/slotTemplate.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { buildRecurringSlots, venueDateEndUtc } from './slotGenerator';

const DAY_MS = 24 * 60 * 60 * 1000;

const clampMaxAdvance = (v: number | undefined) =>
  Math.max(1, Math.min(365, Math.round(Number(v)) || 60));

const log = (msg: string, err?: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`[autoExtend] ${msg}`, err ?? '');
};

/** The template to roll forward: the venue's referenced one (if still owned),
 * else the owner's default template. Returns null when neither exists. */
async function pickTemplate(venue: IVenue): Promise<ISlotTemplate | null> {
  const ae = venue.settings?.auto_extend;
  const owner = venue.owner_user_id;
  if (ae?.template_id) {
    const referenced = await SlotTemplateModel.findOne({ _id: ae.template_id, owner_user_id: owner });
    if (referenced) return referenced;
  }
  return SlotTemplateModel.findOne({ owner_user_id: owner, is_default: true });
}

/** Top up one venue's availability up to its configured rolling horizon.
 * Idempotent — createSkippingOverlaps drops anything already present, so a
 * re-run creates nothing new. Returns the number of slots created. */
async function runForVenue(venueId: string): Promise<number> {
  const venue = await VenueModel.findById(venueId);
  if (!venue) return 0;
  const ae = venue.settings?.auto_extend;
  if (!ae?.enabled || venue.status !== 'APPROVED' || !venue.is_active) return 0;

  const template = await pickTemplate(venue);
  if (!template) return 0;

  const now = new Date();
  const maxAdvanceDays = clampMaxAdvance(venue.settings?.rules?.max_advance_days);
  const horizon = Math.min(ae.horizon_days || 0, maxAdvanceDays);
  if (horizon <= 0) return 0;

  let to = new Date(now.getTime() + horizon * DAY_MS);
  if (ae.until) {
    const untilEnd = venueDateEndUtc(ae.until);
    if (untilEnd && untilEnd < to) to = untilEnd;
  }
  if (to <= now) return 0;

  const slots = buildRecurringSlots(template.config, venue.settings, now, to, now);
  if (!slots.length) return 0;
  return venueSlotService.createSkippingOverlaps(venueId, String(venue.owner_user_id), slots, maxAdvanceDays);
}

/** Sweep every auto-extend-enabled, approved, active venue. One venue failing
 * never aborts the sweep. Returns how many venues ran and how many slots were
 * created across all of them. */
async function runAll(): Promise<{ venues: number; created: number }> {
  const venues = await VenueModel.find({
    'settings.auto_extend.enabled': true,
    status: 'APPROVED',
    is_active: true,
  }).select('_id');

  let created = 0;
  for (const v of venues) {
    try {
      created += await runForVenue(String(v._id));
    } catch (e) {
      log(`venue ${String(v._id)} failed:`, e);
    }
  }
  return { venues: venues.length, created };
}

let started = false;

export const autoExtendService = {
  runForVenue,
  runAll,
  /** Registered once at server bootstrap: run immediately, then daily. Never
   * called from tests (the test harness skips bootstrap), so no timer leaks. */
  async resumeSchedules() {
    if (started) return;
    started = true;
    await runAll().catch((e) => log('initial run failed:', e));
    setInterval(() => {
      void runAll().catch((e) => log('daily run failed:', e));
    }, DAY_MS);
  },
};
