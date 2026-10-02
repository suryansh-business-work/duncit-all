import { Types } from 'mongoose';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { loadMany, type CacheCarrier } from '@utils/request-cache';

/**
 * How many bookable slots a club's venues have open — what Create Pod step 1
 * shows beside each club, so a host learns BEFORE filling four steps that a
 * physical pod there has nowhere to happen.
 *
 * "Open" is the same rule the slot picker lists (`venueSlotService.listAvailable`):
 * AVAILABLE and not yet started. Counted per venue in one `$group` for every
 * venue asked in the tick, because the create-pod query resolves this for every
 * active club at once.
 */
const BUCKET = 'venueOpenSlots';

async function fetchOpenSlotCounts(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>(ids.map((id) => [id, 0]));
  const keys = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (keys.length === 0) return out;
  const rows = await VenueSlotModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { venue_id: { $in: keys }, status: 'AVAILABLE', start_at: { $gte: new Date() } } },
    { $group: { _id: '$venue_id', count: { $sum: 1 } } },
  ]);
  for (const row of rows) out.set(String(row._id), row.count);
  return out;
}

export interface ClubMatchCriteria {
  location_id: string | null;
  locality: string | null;
  super_category_id: string | null;
  category_id: string | null;
}

/** Open slots across every venue that auto-matches the club. 0 with no venues. */
export async function countOpenSlotsForClub(
  carrier: CacheCarrier,
  criteria: ClubMatchCriteria
): Promise<number> {
  const venueIds = await venueService.matchingIdsForClub(criteria);
  if (venueIds.length === 0) return 0;
  const counts = await loadMany(carrier, BUCKET, venueIds, fetchOpenSlotCounts);
  return venueIds.reduce((total, id) => total + (counts.get(id) ?? 0), 0);
}
