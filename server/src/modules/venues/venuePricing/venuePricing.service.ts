/**
 * A venue's charges (fees, minimum spend, price rules, GST, blocked dates) and
 * its booking calendar. Hosts no longer book at a price the venue set: they
 * send an offer (modules/venues/venueOffer), priced by the same calculation.
 * The helpers exported below are shared with the offer service.
 */
import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel, type IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { resolveEffectiveRates } from '@modules/finance/finance/settlement.service';
import { getAppTimeZone } from '@utils/app-time';
import { logs } from '@observability/log';
import { isPricingConfigured, quoteVenuePrice } from './venuePricing.calc';
import { dayAvailability, type BusyWindow } from './venuePricing.availability';
import { cleanVenuePricing, PricingInputError } from './venuePricing.validate';
import { isYmd, localInstant, localParts, ymdRange } from './venuePricing.time';
import { venuePricingSchema } from './venuePricing.schema.model';
import type { VenuePriceBreakdown, VenuePricing } from './venuePricing.types';

/** What an app build from before host offers is told when it tries to book a venue. */
export const UPDATE_APP_TO_BOOK = 'Venues are booked with an offer now. Please update the app to book this venue.';

const MAX_CALENDAR_DAYS = 62;
const BUSY_STATUSES = ['BOOKED', 'PENDING', 'BLOCKED'];

export const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

/** What a host asks to book. Times are ISO instants; pax counts for PER_PAX. */
export interface InstantBookingRequest {
  start_at: string;
  end_at: string;
  pax?: number | null;
  pets?: boolean | null;
  space_label?: string | null;
}

const spaceFilter = (label: string) => (label === '' ? { $in: ['', null] } : label);

export async function loadVenue(venueId: string, session?: ClientSession) {
  if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue');
  const venue = await VenueModel.findById(venueId)
    .select('owner_user_id status is_active pricing settings capacity capacity_items')
    .session(session ?? null);
  if (!venue) fail('NOT_FOUND', 'Venue not found');
  return venue!;
}

export async function busyWindows(
  venueId: string,
  spaceLabel: string,
  from: Date,
  to: Date,
  session?: ClientSession,
  ignorePodId?: string
) {
  const rows = await VenueSlotModel.find({
    venue_id: new Types.ObjectId(venueId),
    // A pod moving its own booking is not blocked by the booking it is leaving.
    ...(ignorePodId ? { booked_by_pod_id: { $ne: new Types.ObjectId(ignorePodId) } } : {}),
    status: { $in: BUSY_STATUSES },
    start_at: { $lt: to },
    end_at: { $gt: from },
    space_label: spaceFilter(spaceLabel),
  })
    .select('start_at end_at')
    .session(session ?? null)
    .lean();
  return rows.map((r): BusyWindow => ({ start: r.start_at, end: r.end_at }));
}

export async function moneyRates(venueId: string) {
  const [rates, fs] = await Promise.all([resolveEffectiveRates({ venueId }), getFinanceSettings()]);
  return { commissionPct: rates.venue_commission_percent, gstPct: Number(fs.gst_pct) || 0 };
}

export function parseWindow(req: Pick<InstantBookingRequest, 'start_at' | 'end_at'>) {
  const start = new Date(req.start_at);
  const end = new Date(req.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    fail('BAD_USER_INPUT', 'Pick a valid start and end time');
  }
  return { start, end };
}

/**
 * The venue's pricing as a PLAIN object. `pricing` is a Mongoose subdocument
 * whose fields are prototype getters, so spreading it (as `pricingFor` does)
 * copied none of them and every non-nullable field went out as null. A venue
 * stored before pricing existed gets the schema defaults the same way.
 *
 * Defaults only fill a MISSING field: one stored as an explicit null (an older
 * partial write) comes back null, so every null falls back to its schema
 * default here too.
 */
const PRICING_DEFAULTS: Record<string, unknown> = Object.fromEntries(
  Object.entries(venuePricingSchema.paths).map(([field, path]) => {
    const fallback: unknown = path.options.default;
    return [field, typeof fallback === 'function' ? fallback() : fallback];
  })
);

export const pricingOf = (venue: { pricing?: unknown }): VenuePricing => {
  const raw = venue.pricing as { toObject?: () => unknown } | null | undefined;
  const stored = (typeof raw?.toObject === 'function' ? raw.toObject() : (raw ?? {})) as Record<string, unknown>;
  const filled = { ...stored };
  for (const [field, fallback] of Object.entries(PRICING_DEFAULTS)) {
    filled[field] ??= fallback;
  }
  return filled as unknown as VenuePricing;
};

/** A pricing input checked by the shared rules, as a GraphQL error on failure. */
function checkedPricing(raw: unknown): VenuePricing {
  try {
    return cleanVenuePricing(raw);
  } catch (error) {
    if (error instanceof PricingInputError) fail('BAD_USER_INPUT', error.message);
    throw error;
  }
}

function quoteOrFail(pricing: VenuePricing, req: InstantBookingRequest, rates: { commissionPct: number; gstPct: number }) {
  const { start, end } = parseWindow(req);
  const result = quoteVenuePrice(pricing, {
    start,
    end,
    pax: Number(req.pax) || 0,
    pets: !!req.pets,
    commissionPct: rates.commissionPct,
    gstPct: rates.gstPct,
    timeZone: getAppTimeZone(),
  });
  if (!result.ok) fail(result.code === 'NOT_CONFIGURED' ? 'FAILED_PRECONDITION' : 'BAD_USER_INPUT', result.message);
  return (result as { ok: true; breakdown: VenuePriceBreakdown }).breakdown;
}

export type SpaceVenue = { capacity?: number | null; capacity_items?: { label: string; capacity: number }[] | null };

export const spaceCapacity = (venue: SpaceVenue, label: string): number =>
  label === ''
    ? Number(venue.capacity) || 0
    : Number((venue.capacity_items ?? []).find((c) => c.label === label)?.capacity) || 0;

export const venuePricingService = {
  /** Approved venues whose pricing is unset — hosts cannot book them until it is. */
  async setupGaps() {
    const venues = await VenueModel.find({
      status: 'APPROVED',
      $or: [{ 'pricing.model': null }, { pricing: { $exists: false } }],
    })
      .select('_id venue_no venue_name')
      .sort({ venue_name: 1 })
      .lean();
    return venues.map((v) => ({ venue_id: String(v._id), venue_no: v.venue_no ?? null, venue_name: v.venue_name ?? '' }));
  },

  /** The venue's pricing as stored — readable by anyone who can see the venue. */
  async pricingFor(venueId: string): Promise<VenuePricing & { configured: boolean }> {
    const venue = await loadVenue(venueId);
    const pricing = pricingOf(venue);
    return { ...pricing, configured: isPricingConfigured(pricing) };
  },

  /** Owner (or admin) saves the venue's pricing. Existing bookings keep their snapshots. */
  async savePricing(userId: string, isAdmin: boolean, venueId: string, input: unknown) {
    const venue = await loadVenue(venueId);
    if (!isAdmin && String(venue.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
    venue.set('pricing', checkedPricing(input));
    venue.markModified('pricing');
    await venue.save();
    return this.pricingFor(venueId);
  },

  /**
   * Prices a window. With `draft` (the owner's unsaved pricing) it previews
   * the Venue Pricing Module; without it, it quotes the venue's saved pricing
   * for Create Pod. Either way the number comes from the one calculation.
   */
  async quote(userId: string, venueId: string, req: InstantBookingRequest, draft?: unknown) {
    // Hosts book with an offer now (venueOfferQuote); only the owner's preview prices here.
    if (draft == null) fail('FAILED_PRECONDITION', UPDATE_APP_TO_BOOK);
    const venue = await loadVenue(venueId);
    if (String(venue.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
    const pricing = checkedPricing(draft);
    return quoteOrFail(pricing, req, await moneyRates(venueId));
  },

  /** Day-by-day availability for the host's date and time pickers. */
  async calendar(venueId: string, from: string, to: string, spaceLabel?: string | null) {
    if (!isYmd(from) || !isYmd(to) || from > to) fail('BAD_USER_INPUT', 'Pick a valid date range');
    const days = ymdRange(from, to);
    if (days.length > MAX_CALENDAR_DAYS) fail('BAD_USER_INPUT', `Ask for at most ${MAX_CALENDAR_DAYS} days`);
    const venue = await loadVenue(venueId);
    const pricing = pricingOf(venue);
    const timeZone = getAppTimeZone();
    const busy = await busyWindows(
      venueId,
      spaceLabel ?? '',
      localInstant(days[0], 0, timeZone),
      localInstant(days.at(-1) ?? days[0], 24 * 60, timeZone)
    );
    const ctx = { pricing, settings: venue.settings, busy, now: new Date(), timeZone };
    return {
      model: pricing.model,
      configured: isPricingConfigured(pricing),
      booking_increment_minutes: pricing.booking_increment_minutes,
      min_hours: pricing.min_hours,
      max_hours: pricing.max_hours,
      min_pax: pricing.min_pax,
      max_pax: pricing.max_pax,
      // The pickers keep this gap around busy windows and this much notice, as the booking write does.
      buffer_minutes: Math.max(0, Number(venue.settings?.rules?.buffer_minutes) || 0),
      min_notice_minutes: Math.max(0, Number(venue.settings?.rules?.min_notice_minutes) || 0),
      days: days.map((ymd) => dayAvailability(ctx, ymd)),
    };
  },

  /**
   * Freezes the price of a venue's own published slot the moment a pod books
   * it, in the same snapshot shape as an instant booking, so it too settles
   * on the price it was booked at with the commission on top. A slot that
   * already carries a snapshot is left alone. Best-effort: on failure the
   * booking stands and settles by the legacy slot rule, and the error is logged.
   */
  async freezeSlotPrice(slotId: string, pax: number): Promise<IVenueSlot | null> {
    try {
      const slot = await VenueSlotModel.findOne({ _id: slotId, price_snapshot: null });
      if (!slot) return null;
      const { slotVenueCharge, pricingModeOf } = await import('@modules/venues/venueSlot/slotCharge');
      const charge = slotVenueCharge(slot, { pax });
      const rates = await moneyRates(String(slot.venue_id));
      const venuePrice = Math.round(charge.base * 100);
      const fee = Math.round((venuePrice * rates.commissionPct) / 100);
      const mode = pricingModeOf(slot.pricing_mode);
      const modelOf = { FLAT: 'PER_SLOT', HOURLY: 'PER_HOUR', PER_PAX: 'PER_PAX' } as const;
      slot.price_snapshot = {
        model: modelOf[mode],
        rate: Number(slot.price) || 0,
        pax: mode === 'PER_PAX' ? Math.max(0, Math.floor(pax)) : 0,
        hours: (slot.end_at.getTime() - slot.start_at.getTime()) / 3_600_000,
        date: localParts(slot.start_at, getAppTimeZone()).ymd,
        base: venuePrice / 100,
        rules: [],
        rules_total: 0,
        min_spend_top_up: 0,
        cleaning_fee: 0,
        pet_fee: 0,
        venue_price: venuePrice / 100,
        gst_pct: 0,
        taxes: 0,
        venue_payout: venuePrice / 100,
        platform_fee_pct: rates.commissionPct,
        platform_fee: fee / 100,
        total: (venuePrice + fee) / 100,
        deposit: 0,
        confirmed_at: new Date(),
      };
      await slot.save();
      return slot;
    } catch (error) {
      logs.server.error('venuePricing', 'freezeSlotPrice', { error, slot_id: slotId });
      return null;
    }
  },
};
