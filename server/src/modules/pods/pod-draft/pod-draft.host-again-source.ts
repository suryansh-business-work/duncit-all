import { Types } from 'mongoose';
import type { IPod } from '../pod/pod.model';
import { VenueModel } from '../../venues/venue/venue.model';
import { ClubModel } from '../../clubs/club/club.model';
import { HostModel } from '../../venues/host/host.model';
import { LocationModel } from '../../platform/location/location.model';
import { InventoryProductModel } from '../../venues/inventory/inventory.model';

/**
 * What "Host again" learns about the source pod's surroundings TODAY — its
 * club, venue, city and the host's categories — and what it could not carry
 * over. Each notice is a code the client words in its own locale:
 *
 * - CLUB_UNAVAILABLE: the club is no longer active, so step 1 asks for another.
 * - VENUE_UNAVAILABLE: the venue no longer takes pods, so step 3 asks for another.
 * - LOCATION_MISSING: the pod's city is gone or switched off, so it opens in the header's.
 * - CATEGORY_MISSING: the club's category is not one the host may still run.
 * - PRODUCTS_UNAVAILABLE: some Pod Shop items are out of stock or delisted.
 */
export type HostAgainNotice =
  | 'CLUB_UNAVAILABLE'
  | 'VENUE_UNAVAILABLE'
  | 'LOCATION_MISSING'
  | 'CATEGORY_MISSING'
  | 'PRODUCTS_UNAVAILABLE';

type Id = Types.ObjectId | string | null | undefined;

interface SourceClub {
  is_active?: boolean;
  location_id?: Id;
  locality?: string | null;
  super_category_id?: Id;
  category_id?: Id;
}

interface SourceVenue {
  status?: string;
  is_active?: boolean;
  location_id?: Id;
  locality?: string | null;
}

interface HostCategoryIds {
  super_category_id?: Id;
  sub_category_id?: Id;
}

export interface HostAgainSource {
  club: SourceClub | null;
  venue: SourceVenue | null;
  hostCategories: HostCategoryIds[];
  /** The cities among the candidates that still exist and take pods. */
  liveLocationIds: Set<string>;
  /** The Pod Shop products a new pod may still offer. */
  liveProductIds: Set<string>;
}

const str = (id: Id) => (id ? String(id) : '');

/** The host category key both steppers use: `${super}|${sub}`. */
const keyOf = (superId: Id, subId: Id) => `${str(superId)}|${str(subId)}`;

/**
 * The host's category the club belongs to — an exact Super + Sub match first,
 * then a Super-only category (which covers every Sub), else '' so step 1 asks.
 */
export function hostCategoryKeyFor(club: SourceClub | null, hostCategories: HostCategoryIds[]): string {
  if (!club?.super_category_id) return '';
  const keys = new Set(hostCategories.map((c) => keyOf(c.super_category_id, c.sub_category_id)));
  const exact = keyOf(club.super_category_id, club.category_id);
  if (keys.has(exact)) return exact;
  const superOnly = keyOf(club.super_category_id, null);
  return keys.has(superOnly) ? superOnly : '';
}

/** Loads everything the copy needs in one round of parallel reads. */
export async function loadHostAgainSource(pod: IPod, userId: string): Promise<HostAgainSource> {
  const productIds = (pod.product_requests ?? []).map((item) => item.product_id);
  const [club, venue, host, liveProducts] = await Promise.all([
    pod.club_id
      ? ClubModel.findById(pod.club_id)
          .select('is_active location_id locality super_category_id category_id')
          .lean<SourceClub>()
      : null,
    pod.venue_id
      ? VenueModel.findById(pod.venue_id).select('status is_active location_id locality').lean<SourceVenue>()
      : null,
    HostModel.findOne({ user_id: new Types.ObjectId(userId) }).select('host_categories').lean<{
      host_categories?: HostCategoryIds[];
    }>(),
    productIds.length
      ? InventoryProductModel.find({
          _id: { $in: productIds },
          is_active: true,
          status: 'ACTIVE',
          pod_available: true,
          listing_review_status: 'APPROVED',
        })
          .select('_id')
          .lean()
      : [],
  ]);
  const cityIds = [pod.location_id, club?.location_id, venue?.location_id].map(str).filter(Boolean);
  const liveCities = cityIds.length
    ? await LocationModel.find({ _id: { $in: [...new Set(cityIds)] }, is_active: true }).select('_id').lean()
    : [];
  return {
    club,
    venue,
    hostCategories: host?.host_categories ?? [],
    liveLocationIds: new Set(liveCities.map((doc) => String(doc._id))),
    liveProductIds: new Set(liveProducts.map((doc) => String(doc._id))),
  };
}

export const clubBookable = (club: SourceClub | null) => !!club && club.is_active !== false;

export const venueBookable = (venue: SourceVenue | null) =>
  !!venue && venue.status === 'APPROVED' && venue.is_active === true;

/**
 * The pod's city, then its club's, then its venue's — the first that still
 * exists. A pod booked through a venue slot often has no city of its own.
 */
export function sourceLocationId(pod: IPod, source: HostAgainSource): string {
  const candidates = [pod.location_id, source.club?.location_id, source.venue?.location_id].map(str);
  return candidates.find((id) => id && source.liveLocationIds.has(id)) ?? '';
}

/**
 * The area of that city. A kept club decides it — step 1 only lists the clubs
 * of the picked area, so any other area would hide the club. Without one, the
 * pod's own area, then the venue's. Physical pods store no area of their own.
 */
export function sourceLocality(pod: IPod, source: HostAgainSource, keepClub: boolean): string {
  if (keepClub && source.club?.locality) return source.club.locality;
  return pod.zone_name?.trim() || source.venue?.locality?.trim() || '';
}
