import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { SeriesWindow } from './podSeries.dates';
import type { IPodSeriesSkip } from './podSeries.model';

/** One date of a physical series: the venue slot it would book, or why none. */
export interface SeriesSlotMatch {
  window: SeriesWindow;
  slotId: string | null;
  price: number | null;
  reason: IPodSeriesSkip['reason'] | null;
}

interface FirstSlot {
  _id: Types.ObjectId;
  venue_id: Types.ObjectId;
  space_label?: string | null;
  start_at: Date;
  end_at: Date;
  status: string;
}

/** The slot the host picked for the FIRST date — the pattern every later date
 * must repeat: same venue, same space, same start and end time. */
export async function firstSeriesSlot(slotId: string, venueId?: string | null): Promise<FirstSlot> {
  if (!Types.ObjectId.isValid(slotId)) {
    throw new GraphQLError('Invalid slot', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const slot = await VenueSlotModel.findById(slotId)
    .select('venue_id space_label start_at end_at status')
    .lean<FirstSlot>();
  if (!slot) throw new GraphQLError('Selected slot not found', { extensions: { code: 'NOT_FOUND' } });
  if (venueId && String(slot.venue_id) !== String(venueId)) {
    throw new GraphQLError('Slot does not belong to the selected venue', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return slot;
}

/**
 * Pairs each date with the venue's slot for it. A date is only offered when the
 * venue has opened an identical slot (same space, same times) and it is still
 * AVAILABLE; otherwise the date says why — the venue is on leave, the slot is
 * already taken, or the venue never opened one. One query for the slots and one
 * for the venue's leave, however many dates there are.
 */
export async function matchSeriesSlots(first: FirstSlot, windows: SeriesWindow[]): Promise<SeriesSlotMatch[]> {
  const starts = windows.map((w) => w.start);
  const [slots, venue, { venueLocalYmd }] = await Promise.all([
    VenueSlotModel.find({
      venue_id: first.venue_id,
      space_label: first.space_label ?? '',
      start_at: { $in: starts },
    })
      .select('start_at end_at status price')
      .lean<{ _id: Types.ObjectId; start_at: Date; end_at: Date; status: string; price: number }[]>(),
    VenueModel.findById(first.venue_id).select('settings.holidays').lean<{ settings?: { holidays?: string[] } }>(),
    import('@modules/venues/autoExtend/slotGenerator'),
  ]);
  const holidays = new Set(venue?.settings?.holidays ?? []);
  const length = first.end_at.getTime() - first.start_at.getTime();

  return windows.map((window) => {
    const end = new Date(window.start.getTime() + length);
    const same = slots.filter(
      (s) => s.start_at.getTime() === window.start.getTime() && s.end_at.getTime() === end.getTime()
    );
    const open = same.find((s) => s.status === 'AVAILABLE');
    const at = { window: { start: window.start, end } };
    if (holidays.has(venueLocalYmd(window.start))) return { ...at, slotId: null, price: null, reason: 'HOLIDAY' };
    if (open) return { ...at, slotId: String(open._id), price: open.price ?? 0, reason: null };
    return { ...at, slotId: null, price: null, reason: same.length ? 'TAKEN' : 'NO_SLOT' };
  });
}
