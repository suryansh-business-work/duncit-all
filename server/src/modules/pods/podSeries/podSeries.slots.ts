import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { SlotPricingMode } from '@modules/venues/venueSlot/slotCharge';
import type { SeriesWindow } from './podSeries.dates';
import type { IPodSeriesSkip } from './podSeries.model';

/** One date of a physical series: the venue slot it would book, or why none. */
export interface SeriesSlotMatch {
  window: SeriesWindow;
  slotId: string | null;
  price: number | null;
  reason: IPodSeriesSkip['reason'] | null;
  /** The venue has no slot here: one is requested, and opened when the venue accepts. */
  onRequest: boolean;
}

/** The host's first slot — the pattern, and the price, every later date repeats. */
export interface FirstSlot {
  _id: Types.ObjectId;
  venue_id: Types.ObjectId;
  owner_user_id: Types.ObjectId;
  space_label?: string | null;
  start_at: Date;
  end_at: Date;
  status: string;
  price?: number;
  pricing_mode?: SlotPricingMode;
  overtime_rate?: number;
  capacity?: number;
}

/** The slot the host picked for the FIRST date — the pattern every later date
 * must repeat: same venue, same space, same start and end time. */
export async function firstSeriesSlot(slotId: string, venueId?: string | null): Promise<FirstSlot> {
  if (!Types.ObjectId.isValid(slotId)) {
    throw new GraphQLError('Invalid slot', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const slot = await VenueSlotModel.findById(slotId)
    .select('venue_id owner_user_id space_label start_at end_at status price pricing_mode overtime_rate capacity')
    .lean<FirstSlot>();
  if (!slot) throw new GraphQLError('Selected slot not found', { extensions: { code: 'NOT_FOUND' } });
  if (venueId && String(slot.venue_id) !== String(venueId)) {
    throw new GraphQLError('Slot does not belong to the selected venue', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return slot;
}

/** The space filter every overlap check uses: '' also matches legacy slots with no field. */
export const spaceFilter = (label: string | null | undefined) => {
  const space = label ?? '';
  return space === '' ? { $in: ['', null] } : space;
};

interface NearSlot {
  _id: Types.ObjectId;
  start_at: Date;
  end_at: Date;
  status: string;
  price: number;
}

/**
 * Pairs each date with the venue's slot for it. A date books the venue's
 * identical slot (same space, same times) when it is still AVAILABLE. When the
 * venue has no slot touching that window at all, the date is still offered —
 * ON REQUEST, at the first slot's price — and the slot is opened only if the
 * venue accepts. A date is refused when the venue is on leave, or when some
 * other slot already covers that time (taken, or a different window).
 * One query for the slots and one for the venue's leave, however many dates.
 */
export async function matchSeriesSlots(first: FirstSlot, windows: SeriesWindow[]): Promise<SeriesSlotMatch[]> {
  const length = first.end_at.getTime() - first.start_at.getTime();
  const spans = windows.map((w) => ({ start: w.start, end: new Date(w.start.getTime() + length) }));
  const [slots, venue, { venueLocalYmd }] = await Promise.all([
    spans.length
      ? VenueSlotModel.find({
          venue_id: first.venue_id,
          space_label: spaceFilter(first.space_label),
          $or: spans.map((s) => ({ start_at: { $lt: s.end }, end_at: { $gt: s.start } })),
        })
          .select('start_at end_at status price')
          .lean<NearSlot[]>()
      : Promise.resolve([] as NearSlot[]),
    VenueModel.findById(first.venue_id).select('settings.holidays').lean<{ settings?: { holidays?: string[] } }>(),
    import('@modules/venues/autoExtend/slotGenerator'),
  ]);
  const holidays = new Set(venue?.settings?.holidays ?? []);

  return spans.map(({ start, end }) => {
    const at = { window: { start, end } };
    const touching = slots.filter((s) => s.start_at < end && s.end_at > start);
    const open = touching.find(
      (s) => s.status === 'AVAILABLE' && s.start_at.getTime() === start.getTime() && s.end_at.getTime() === end.getTime()
    );
    if (holidays.has(venueLocalYmd(start))) {
      return { ...at, slotId: null, price: null, reason: 'HOLIDAY' as const, onRequest: false };
    }
    if (open) return { ...at, slotId: String(open._id), price: open.price ?? 0, reason: null, onRequest: false };
    if (touching.length) return { ...at, slotId: null, price: null, reason: 'TAKEN' as const, onRequest: false };
    return { ...at, slotId: null, price: first.price ?? 0, reason: null, onRequest: true };
  });
}
