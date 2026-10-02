/**
 * Raw-row builders shared by the Auto Pod integration suites.
 *
 * Rows go in through `Model.collection.insertOne` so a test controls every
 * field — `created_at` / `updated_at` included, which the sweep and the
 * clocks read — without the save hooks or the timestamps plugin rewriting
 * them. Every value is obviously fake.
 */
import { Types } from 'mongoose';
import { AutoPodModel } from '../../autoPod.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';

export const HOUR_MS = 3_600_000;
export const oid = () => new Types.ObjectId();
export const IMAGE = { url: 'https://cdn.example.com/auto-pod.jpg', type: 'IMAGE' };

/** SUPER → CATEGORY → SUB, the tree `resolveCategoryPair` walks. */
export async function seedCategoryTree(minPax = 0) {
  const superId = oid();
  const midId = oid();
  const subId = oid();
  await CategoryModel.collection.insertMany([
    { _id: superId, name: 'Sports', level: 'SUPER', parent_id: null },
    { _id: midId, name: 'Racket', level: 'CATEGORY', parent_id: superId },
    { _id: subId, name: 'Badminton', level: 'SUB', parent_id: midId, min_pax: minPax },
  ]);
  return { superId, midId, subId };
}

export async function seedLocation(over: Record<string, unknown> = {}) {
  const _id = oid();
  await LocationModel.collection.insertOne({
    _id,
    location_name: 'Bengaluru',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    is_active: true,
    ...over,
  });
  return _id;
}

export async function seedUser(over: Record<string, unknown> = {}) {
  const _id = oid();
  await UserModel.collection.insertOne({
    _id,
    profile: { first_name: 'Test', last_name: 'Partner' },
    auth: { email: `partner-${String(_id)}@example.com` },
    ...over,
  });
  return _id;
}

export async function seedClub(over: Record<string, unknown> = {}) {
  const _id = oid();
  await ClubModel.collection.insertOne({
    _id,
    club_name: 'Smash Club',
    category_id: null,
    location_id: null,
    admin_user_ids: [],
    is_active: true,
    ...over,
  });
  return _id;
}

export async function seedVenue(over: Record<string, unknown> & { owner_user_id: Types.ObjectId }) {
  const _id = oid();
  const { sub_category_id: subId, ...rest } = over as Record<string, unknown>;
  await VenueModel.collection.insertOne({
    _id,
    venue_name: 'Play Arena',
    status: 'APPROVED',
    is_active: true,
    location_id: null,
    venue_category: { sub_category_id: subId ?? null },
    ...rest,
  });
  return _id;
}

export async function seedHost(userId: Types.ObjectId, subIds: Types.ObjectId[], over: Record<string, unknown> = {}) {
  const _id = oid();
  await HostModel.collection.insertOne({
    _id,
    user_id: userId,
    status: 'APPROVED',
    is_active: true,
    host_categories: subIds.map((sub_category_id) => ({ sub_category_id })),
    ...over,
  });
  return _id;
}

export async function seedSlot(over: Record<string, unknown> & {
  venue_id: Types.ObjectId;
  owner_user_id: Types.ObjectId;
}) {
  const _id = oid();
  await VenueSlotModel.collection.insertOne({
    _id,
    start_at: new Date(Date.now() + 48 * HOUR_MS),
    end_at: new Date(Date.now() + 50 * HOUR_MS),
    price: 500,
    capacity: 20,
    status: 'AVAILABLE',
    ...over,
  });
  return _id;
}

/** The snapshot an enrolment pins, for a row that is already pinned. */
export const pinnedTo = (locationId: Types.ObjectId, boundBy = 'VENUE') => ({
  location_id: locationId,
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: boundBy,
  bound_at: new Date('2026-09-01T00:00:00Z'),
});

export const venueClaim = (over: Record<string, unknown> = {}) => ({
  venue_id: oid(),
  venue_slot_id: oid(),
  owner_user_id: oid(),
  venue_name: 'Play Arena',
  pod_date_time: new Date(Date.now() + 48 * HOUR_MS),
  pod_end_date_time: new Date(Date.now() + 50 * HOUR_MS),
  slot_price: 500,
  accepted_at: new Date(),
  ...over,
});

export const hostClaim = (userId: Types.ObjectId = oid(), over: Record<string, unknown> = {}) => ({
  user_id: userId,
  host_name: 'Asha Host',
  assigned_at: new Date(),
  ...over,
});

export const clubClaim = (
  clubId: Types.ObjectId = oid(),
  userId: Types.ObjectId = oid(),
  over: Record<string, unknown> = {}
) => ({
  club_id: clubId,
  club_name: 'Smash Club',
  user_id: userId,
  claimed_at: new Date(),
  ...over,
});

let seq = 0;

/** A complete Auto Pod row with every field present, overridable per test. */
export async function insertAutoPod(over: Record<string, unknown> = {}) {
  seq += 1;
  const _id = oid();
  const now = new Date();
  await AutoPodModel.collection.insertOne({
    _id,
    auto_pod_no: `APOD-T${seq}-${String(_id).slice(-6)}`,
    stage: 'OPEN',
    created_by: null,
    is_active: true,
    venue_window_from: null,
    pod_title: 'Sunday Smash',
    pod_description: 'A friendly doubles evening',
    pod_info: '',
    pod_hashtag: [],
    pod_images_and_videos: [IMAGE],
    reel_url: null,
    super_category_id: oid(),
    sub_category_id: oid(),
    pod_mode: 'PHYSICAL',
    meeting_platform: null,
    meeting_url: null,
    meeting_notes: null,
    pod_date_time: null,
    pod_end_date_time: null,
    pod_type: 'PAID',
    pod_amount: 0,
    no_of_spots: 0,
    pod_occurrence: 'ONE_TIME',
    what_this_pod_offers: [],
    available_perks: [],
    payment_terms: null,
    place_charges: [],
    products_enabled: false,
    product_requests: [],
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_windows: [],
    pod_id: null,
    materialized_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: '',
    events: [],
    created_at: now,
    updated_at: now,
    ...over,
  });
  return _id;
}

export const loadRaw = (id: Types.ObjectId) => AutoPodModel.findById(id).lean();
