import { GraphQLError } from 'graphql';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import { mediaLibraryService } from '@modules/platform/upload/mediaLibrary.service';

/**
 * Everything a pod needs that the person asking never supplies.
 *
 * "Create 10 pods" names none of a club, a host, a venue, a slot or a picture,
 * and a pod cannot exist without all five. This module goes and finds them —
 * and when one genuinely is not there, says which one, because "creation
 * failed" ten times over tells an operator nothing they can act on.
 */

/** Venue slots are claimed one per pod, so ask for more than we need. */
const SLOT_OVERSCAN = 4;
const VENUE_SCAN = 50;

const missing = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'AGENT_NO_RESOURCE' } });

export interface AgentSlot {
  slotId: string;
  venueId: string;
  venueName: string;
  ownerUserId: string;
  startAt: Date;
  endAt: Date;
  price: number;
}

export interface AgentClub {
  id: string;
  name: string;
  /** The sub-category's floor on spots — a pod under it is rejected on create. */
  minPax: number;
}

/**
 * The club the pods hang off.
 *
 * Newest active club, because that is the one an operator setting up a batch
 * has almost always just made. Its sub-category carries `min_pax`, which the
 * pod service enforces — reading it here is what stops all ten failing on a
 * floor nobody mentioned.
 */
export async function pickClub(): Promise<AgentClub> {
  const club = await ClubModel.findOne({ is_active: true }).sort({ created_at: -1 });
  if (!club) {
    throw missing('There is no active club to attach pods to. Create a club first.');
  }
  let minPax = 0;
  if (club.category_id) {
    const sub = await CategoryModel.findById(club.category_id).select('min_pax');
    minPax = sub?.min_pax ?? 0;
  }
  return { id: String(club._id), name: club.club_name, minPax };
}

/**
 * Who hosts them.
 *
 * An approved host is the right answer — they carry the payout rates the pod's
 * economics are checked against. When the platform has none, the person running
 * the agent hosts it themselves rather than the run failing: they are an admin,
 * the pod is theirs, and it can be reassigned afterwards.
 */
export async function pickHostUserId(fallbackUserId: string): Promise<string> {
  const host = await HostModel.findOne({ status: 'APPROVED', is_active: true })
    .sort({ approved_at: -1 })
    .select('user_id');
  return host ? String(host.user_id) : fallbackUserId;
}

/**
 * Free slots at live venues, soonest first.
 *
 * Read straight from the slot collection rather than per venue: one query for
 * the lot beats one per venue, and the leave-day filter that
 * `venueSlotService.listAvailable` applies is reapplied here from the same
 * venue settings — a slot on a leave day is refused at create time, so handing
 * one over would just be a failure with extra steps.
 */
export async function pickSlots(count: number): Promise<AgentSlot[]> {
  const venues = await VenueModel.find({ status: 'APPROVED', is_active: true })
    .select('venue_name owner_user_id settings.holidays')
    .limit(VENUE_SCAN);
  if (venues.length === 0) {
    throw missing('There are no approved, active venues, so no slot can be booked.');
  }

  const byId = new Map(venues.map((venue) => [String(venue._id), venue]));
  const slots = await VenueSlotModel.find({
    venue_id: { $in: venues.map((venue) => venue._id) },
    status: 'AVAILABLE',
    start_at: { $gte: new Date() },
  })
    .sort({ start_at: 1 })
    .limit(count * SLOT_OVERSCAN);

  const open: AgentSlot[] = [];
  for (const slot of slots) {
    const venue = byId.get(String(slot.venue_id));
    if (!venue) continue;
    const holidays = new Set(venue.settings?.holidays ?? []);
    if (holidays.has(venueLocalYmd(slot.start_at))) continue;
    open.push({
      slotId: String(slot._id),
      venueId: String(slot.venue_id),
      venueName: venue.venue_name || 'Venue',
      ownerUserId: String(venue.owner_user_id),
      startAt: slot.start_at,
      endAt: slot.end_at,
      price: slot.price ?? 0,
    });
  }

  if (open.length === 0) {
    throw missing('No venue has a free upcoming slot. Add slots on a venue and try again.');
  }
  return open;
}

/**
 * Cover images, straight from the media library.
 *
 * Every pod must carry at least one image, and the server refuses one that
 * does not. These are files already uploaded to ImageKit rather than anything
 * generated — reusing what the team has put there keeps a batch looking like
 * the rest of the platform.
 */
export async function pickImages(count: number): Promise<string[]> {
  const files = await mediaLibraryService.list({
    fileType: 'image',
    limit: Math.max(count, 10),
    sort: 'DESC_CREATED',
  });
  const urls = files.map((file) => file.url).filter(Boolean);
  if (urls.length === 0) {
    throw missing('There are no images in the media library, and every pod needs a cover image.');
  }
  return urls;
}
