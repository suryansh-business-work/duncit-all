import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { IVenueRentalItem } from '@modules/venues/venue/venue.rentals';
import { podLiveEnd } from '@modules/pods/pod/pod.lifecycle';
import { rentalSettingsService } from './rentalSettings.service';
import { RentalStockModel } from './rentalStock.model';
import type { RentalLine } from './rentalLines';

/**
 * Price the rented items a guest picked at pod checkout. The server is the only
 * authority: the client sends item ids and quantities, never a price.
 *
 * The stock check here is a courtesy — it stops a guest paying for something
 * already gone. The binding reservation happens at capture
 * (`rentalBooking.service`), atomically, because a payment can be captured up
 * to a day after its checkout was priced.
 */

export interface RentalSelection {
  item_id?: unknown;
  quantity?: unknown;
}

export interface RentalPod {
  _id: Types.ObjectId | string;
  venue_id?: Types.ObjectId | string | null;
  pod_mode?: string | null;
  pod_date_time?: Date | string | null;
  pod_end_date_time?: Date | string | null;
}

export interface RentalResolution {
  lines: RentalLine[];
  rent_total: number;
  deposit_total: number;
  /** rent_total + deposit_total — charged in full, never couponed or paid in coins. */
  total: number;
}

export const EMPTY_RENTALS: RentalResolution = { lines: [], rent_total: 0, deposit_total: 0, total: 0 };

const HOUR_MS = 3_600_000;
const MAX_SELECTIONS = 50;

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** The hours an HOUR item is charged for: the pod's length, rounded up, at least one. */
export function podRentalHours(pod: RentalPod): number {
  const start = pod.pod_date_time ? new Date(pod.pod_date_time).getTime() : Number.NaN;
  const end = podLiveEnd(pod)?.getTime() ?? Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.ceil((end - start) / HOUR_MS));
}

/** The selections as whole, distinct (item, quantity) pairs. */
function normalizeSelections(raw: readonly RentalSelection[]): { itemId: string; quantity: number }[] {
  if (raw.length > MAX_SELECTIONS) bad('Too many rented items in one booking');
  const picks = raw.map((s) => ({ itemId: String(s.item_id ?? ''), quantity: Number(s.quantity) }));
  for (const pick of picks) {
    if (!Types.ObjectId.isValid(pick.itemId)) bad('That rented item could not be found');
    if (!Number.isInteger(pick.quantity) || pick.quantity < 1) bad('Choose how many of each rented item you need');
  }
  if (new Set(picks.map((p) => p.itemId)).size !== picks.length) bad('The same rented item was sent twice');
  return picks;
}

async function assertRentingOpen(pod: RentalPod): Promise<void> {
  const settings = await rentalSettingsService.get();
  if (!settings.enabled) bad('Renting items is not available right now');
  if (pod.pod_mode === 'VIRTUAL' || !pod.venue_id) bad('This pod has no venue to rent items from');
  const start = pod.pod_date_time ? new Date(pod.pod_date_time).getTime() : Number.NaN;
  if (!Number.isNaN(start) && start - settings.booking_cutoff_hours * HOUR_MS <= Date.now()) {
    bad(`Renting for this pod closed ${settings.booking_cutoff_hours} hours before it starts`);
  }
}

/** Units already booked for this pod, per item. */
async function bookedFor(podId: RentalPod['_id'], itemIds: string[]): Promise<Map<string, number>> {
  const rows = await RentalStockModel.find({
    pod_id: podId,
    item_id: { $in: itemIds.map((id) => new Types.ObjectId(id)) },
  })
    .select('item_id booked')
    .lean();
  return new Map(rows.map((row) => [String(row.item_id), row.booked ?? 0]));
}

function priceLine(item: IVenueRentalItem, quantity: number, hours: number): RentalLine {
  const units = item.unit === 'HOUR' ? hours : 1;
  return {
    item_id: item._id.toHexString(),
    name: item.name,
    image_url: item.images?.[0] ?? '',
    unit: item.unit === 'HOUR' ? 'HOUR' : 'SLOT',
    rate: item.rate,
    units,
    quantity,
    rent: item.rate * units * quantity,
    deposit: (item.deposit ?? 0) * quantity,
  };
}

/**
 * Resolve the guest's picks into priced lines. Every guest on the booking may
 * rent up to the item's per-guest limit, so the cap is that limit times seats.
 */
export async function resolveRentalLines(
  pod: RentalPod,
  selections: readonly RentalSelection[],
  seats: number
): Promise<RentalResolution> {
  if (selections.length === 0) return EMPTY_RENTALS;
  const picks = normalizeSelections(selections);
  await assertRentingOpen(pod);
  const venue = await VenueModel.findById(pod.venue_id).select('offers_rentals rental_items').lean();
  if (!venue?.offers_rentals) bad('This venue does not rent items');
  const items = new Map((venue?.rental_items ?? []).map((item) => [item._id.toHexString(), item]));
  const booked = await bookedFor(
    pod._id,
    picks.map((p) => p.itemId)
  );
  const hours = podRentalHours(pod);
  const lines = picks.map(({ itemId, quantity }) => {
    const item = items.get(itemId);
    if (!item || item.is_available === false) return bad('That rented item is no longer available');
    const cap = (item.per_guest_limit ?? 1) * Math.max(1, seats);
    if (quantity > cap) bad(`You can rent up to ${cap} of "${item.name}" for this booking`);
    const left = Math.max(0, item.stock - (booked.get(itemId) ?? 0));
    if (quantity > left) bad(left > 0 ? `Only ${left} of "${item.name}" left for this pod` : `"${item.name}" is sold out for this pod`);
    return priceLine(item, quantity, hours);
  });
  const rent_total = lines.reduce((sum, l) => sum + l.rent, 0);
  const deposit_total = lines.reduce((sum, l) => sum + l.deposit, 0);
  return { lines, rent_total, deposit_total, total: rent_total + deposit_total };
}
