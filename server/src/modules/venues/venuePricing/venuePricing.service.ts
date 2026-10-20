/**
 * Venue pricing and instant booking. A host books a venue at the price the
 * venue set; there is no request and no approval. The booking is a VenueSlot
 * written BOOKED for the pod with its price frozen in `price_snapshot`.
 */
import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel, type IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { resolveEffectiveRates } from '@modules/finance/finance/settlement.service';
import { withTransaction } from '@utils/mongoTransaction';
import { getAppTimeZone } from '@utils/app-time';
import { logs } from '@observability/log';
import { isPricingConfigured, quoteVenuePrice } from './venuePricing.calc';
import { checkBookable, dayAvailability, type BusyWindow } from './venuePricing.availability';
import { cleanVenuePricing, PricingInputError } from './venuePricing.validate';
import { isYmd, localInstant, localParts, ymdRange } from './venuePricing.time';
import { VenueBookingLockModel } from './venueBookingLock.model';
import type { VenuePriceBreakdown, VenuePricing } from './venuePricing.types';

const MAX_CALENDAR_DAYS = 62;
const BUSY_STATUSES = ['BOOKED', 'PENDING', 'BLOCKED'];

const fail = (code: string, message: string): never => {
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

async function loadVenue(venueId: string, session?: ClientSession) {
  if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue');
  const venue = await VenueModel.findById(venueId)
    .select('owner_user_id status is_active pricing settings capacity capacity_items')
    .session(session ?? null);
  if (!venue) fail('NOT_FOUND', 'Venue not found');
  return venue!;
}

async function busyWindows(
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

async function moneyRates(venueId: string) {
  const [rates, fs] = await Promise.all([resolveEffectiveRates({ venueId }), getFinanceSettings()]);
  return { commissionPct: rates.venue_commission_percent, gstPct: Number(fs.gst_pct) || 0 };
}

function parseWindow(req: InstantBookingRequest) {
  const start = new Date(req.start_at);
  const end = new Date(req.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    fail('BAD_USER_INPUT', 'Pick a valid start and end time');
  }
  return { start, end };
}

const pricingOf = (venue: { pricing?: unknown }): VenuePricing => venue.pricing as VenuePricing;

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

type SpaceVenue = { capacity?: number | null; capacity_items?: { label: string; capacity: number }[] | null };

const spaceCapacity = (venue: SpaceVenue, label: string): number =>
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
    const venue = await loadVenue(venueId);
    if (draft != null && String(venue.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
    const pricing = draft == null ? pricingOf(venue) : checkedPricing(draft);
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
      localInstant(days[days.length - 1], 24 * 60, timeZone)
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

  /** The price a pod would book at, checked against the calendar — no write. Used before the pod row exists. */
  async prepare(venueId: string, req: InstantBookingRequest, ignorePodId?: string) {
    const venue = await loadVenue(venueId);
    if (venue.status !== 'APPROVED' || !venue.is_active) fail('BAD_USER_INPUT', 'Select an approved venue');
    const pricing = pricingOf(venue);
    const breakdown = quoteOrFail(pricing, req, await moneyRates(venueId));
    const { start, end } = parseWindow(req);
    const busy = await busyWindows(
      venueId,
      req.space_label ?? '',
      new Date(start.getTime() - 86_400_000),
      new Date(end.getTime() + 86_400_000),
      undefined,
      ignorePodId
    );
    const check = checkBookable({ pricing, settings: venue.settings, busy, now: new Date(), timeZone: getAppTimeZone() }, start, end);
    if (!check.ok) fail('CONFLICT', check.message);
    return { breakdown, start, end };
  },

  /**
   * A recurring pod's dates, each judged as its own instant booking: the
   * price it would book at, or why it cannot run. One calendar read for the
   * whole series. Nothing is held — each date books when it is published.
   */
  async planWindows(venueId: string, req: InstantBookingRequest, windows: { start: Date; end: Date }[]) {
    if (windows.length === 0) return [];
    const venue = await loadVenue(venueId);
    const pricing = pricingOf(venue);
    const rates = await moneyRates(venueId);
    const timeZone = getAppTimeZone();
    const from = new Date(Math.min(...windows.map((w) => w.start.getTime())) - 86_400_000);
    const to = new Date(Math.max(...windows.map((w) => w.end.getTime())) + 86_400_000);
    const busy = await busyWindows(venueId, req.space_label ?? '', from, to);
    const ctx = { pricing, settings: venue.settings, busy, now: new Date(), timeZone };
    return windows.map(({ start, end }) => {
      const day = dayAvailability(ctx, localParts(start, timeZone).ymd);
      if (day.closed_reason === 'HOLIDAY') return { reason: 'HOLIDAY' as const, total: null };
      if (!checkBookable(ctx, start, end).ok) {
        return { reason: day.closed_reason ? ('NO_SLOT' as const) : ('TAKEN' as const), total: null };
      }
      const quote = quoteVenuePrice(pricing, { ...rates, start, end, pax: Number(req.pax) || 0, pets: !!req.pets, timeZone });
      return quote.ok ? { reason: null, total: quote.breakdown.total } : { reason: 'NO_SLOT' as const, total: null };
    });
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

  /**
   * Books the window for the pod, atomically. Inside one transaction it bumps
   * the venue's lock row, re-reads the calendar, re-prices, and writes the
   * BOOKED slot with its frozen price. A concurrent booking of the same venue
   * conflicts on the lock row; the retry sees it and refuses the overlap.
   */
  async bookForPod(podId: string, venueId: string, req: InstantBookingRequest): Promise<IVenueSlot> {
    const venueOid = new Types.ObjectId(venueId);
    await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $setOnInsert: { version: 0 } }, { upsert: true }).catch(
      (error: { code?: number }) => {
        // Two first bookings racing to create the row: the loser's row already exists.
        if (error?.code !== 11000) throw error;
      }
    );
    const rates = await moneyRates(venueId);
    const space = (req.space_label ?? '').trim();
    return withTransaction(async (session) => {
      await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $inc: { version: 1 } }, { session });
      const venue = await loadVenue(venueId, session);
      const pricing = pricingOf(venue);
      const { start, end } = parseWindow(req);
      const busy = await busyWindows(
        venueId,
        space,
        new Date(start.getTime() - 86_400_000),
        new Date(end.getTime() + 86_400_000),
        session,
        podId
      );
      const check = checkBookable({ pricing, settings: venue.settings, busy, now: new Date(), timeZone: getAppTimeZone() }, start, end);
      if (!check.ok) fail('CONFLICT', check.message);
      const breakdown = quoteOrFail(pricing, req, rates);
      const [slot] = await VenueSlotModel.create(
        [
          {
            venue_id: venueOid,
            owner_user_id: venue.owner_user_id,
            start_at: start,
            end_at: end,
            // Legacy readers (dashboards, slot cards) see the venue's money as a flat price.
            price: breakdown.venue_payout,
            pricing_mode: 'FLAT',
            space_label: space,
            capacity: spaceCapacity(venue, space) || breakdown.pax,
            status: 'BOOKED',
            booked_by_pod_id: new Types.ObjectId(podId),
            price_snapshot: { ...breakdown, confirmed_at: new Date() },
          },
        ],
        { session }
      );
      logs.server.info('venuePricing', 'bookForPod', { pod_id: podId, venue_id: venueId, total: breakdown.total });
      return slot;
    });
  },
};
