import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { assertActiveHost } from '@modules/pods/pod/pod.validation';
import { distanceKm, locationPoint, pointResolver, type GeoPoint } from '@modules/platform/location/location.geo';
import { OPEN_PARTNER_STATUSES, PodPartnerRequestModel } from './podPartnerRequest.model';
import { loadHostSummaries, loadVenueSummaries } from './podPartnerRequest.view';

export const DEFAULT_RADIUS_KM = 5;
export const MAX_RADIUS_KM = 10;
const RESULT_LIMIT = 50;
const CANDIDATE_LIMIT = 2000;

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};
const round1 = (n: number) => Math.round(n * 10) / 10;
/** 0–10 km; anything else (or nothing) is the 5 km default. */
const radiusOf = (r?: number | null) =>
  typeof r === 'number' && Number.isFinite(r) ? Math.min(MAX_RADIUS_KM, Math.max(0, r)) : DEFAULT_RADIUS_KM;
const validIds = (ids?: string[] | null) =>
  (ids ?? []).filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

/** A category id matches at any level of the Super → Category → Sub triple. */
function categoryMatch(path: string, ids: Types.ObjectId[]) {
  if (!ids.length) return {};
  return {
    $or: ['super_category_id', 'category_id', 'sub_category_id'].map((level) => ({ [`${path}.${level}`]: { $in: ids } })),
  };
}

export interface NearbyArgs {
  location_id: string;
  zone_name?: string | null;
  radius_km?: number | null;
  category_ids?: string[] | null;
}

/** The search centre: the city/area the searcher selected in the location picker. */
async function centreOf(args: NearbyArgs): Promise<GeoPoint> {
  if (!Types.ObjectId.isValid(args.location_id)) fail('BAD_USER_INPUT', 'Invalid location');
  const point = await locationPoint(args.location_id, args.zone_name);
  return point ?? fail('FAILED_PRECONDITION', 'This location cannot be placed on the map yet');
}

interface UserPlace {
  _id: Types.ObjectId;
  profile?: { selected_location_id?: Types.ObjectId | null; selected_zone_name?: string };
}

/** Where a host is: the city/area they selected in the app's location picker. */
async function hostPoint(user: UserPlace | null, resolve: ReturnType<typeof pointResolver>) {
  const loc = user?.profile?.selected_location_id;
  return loc ? resolve(String(loc), user?.profile?.selected_zone_name) : null;
}

interface VenuePlace {
  lat?: number | null;
  lng?: number | null;
  location_id?: Types.ObjectId | null;
  locality?: string;
}

/** Where a venue is: its own map pin, else its city/area. */
async function venuePoint(venue: VenuePlace, resolve: ReturnType<typeof pointResolver>) {
  if (typeof venue.lat === 'number' && typeof venue.lng === 'number') return { lat: venue.lat, lng: venue.lng };
  return venue.location_id ? resolve(String(venue.location_id), venue.locality) : null;
}

/** The distance a new request records for its receiver's card; null when either side is unplaced. */
export async function pairDistanceKm(venueId: string, hostUserId: string): Promise<number | null> {
  const resolve = pointResolver();
  const [venue, user] = await Promise.all([
    VenueModel.findById(venueId).select('lat lng location_id locality').lean<VenuePlace>(),
    UserModel.findById(hostUserId).select('profile.selected_location_id profile.selected_zone_name').lean<UserPlace>(),
  ]);
  const [a, b] = await Promise.all([venue ? venuePoint(venue, resolve) : null, hostPoint(user, resolve)]);
  return a && b ? round1(distanceKm(a, b)) : null;
}

/** Open requests between one party and many — the card shows "Requested" instead of the button. */
async function openStatusBy(filter: Record<string, unknown>, key: 'host_user_id' | 'venue_id') {
  const open = await PodPartnerRequestModel.find({ ...filter, is_open: true, status: { $in: OPEN_PARTNER_STATUSES } })
    .select(`${key} status`)
    .lean();
  return new Map(open.map((r) => [String(r[key]), r.status]));
}

export const podPartnerSearch = {
  /** Venue Studio: approved hosts within the radius of the selected location, nearest first. */
  async nearbyHosts(callerId: string, venueId: string, args: NearbyArgs) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue id');
    const venue = await VenueModel.exists({ _id: venueId, owner_user_id: new Types.ObjectId(callerId) });
    if (!venue) fail('FORBIDDEN', 'Not your venue');
    const centre = await centreOf(args);
    const radius = radiusOf(args.radius_km);
    const hosts = await HostModel.find({
      status: 'APPROVED',
      is_active: true,
      user_id: { $ne: new Types.ObjectId(callerId) },
      ...categoryMatch('host_categories', validIds(args.category_ids)),
    })
      .select('user_id')
      .limit(CANDIDATE_LIMIT)
      .lean();
    const users = await UserModel.find({
      _id: { $in: hosts.map((h) => h.user_id) },
      'profile.selected_location_id': { $ne: null },
    })
      .select('profile.selected_location_id profile.selected_zone_name')
      .lean<UserPlace[]>();
    const resolve = pointResolver();
    const placed = await Promise.all(
      users.map(async (u) => {
        const p = await hostPoint(u, resolve);
        return p ? { id: u._id, km: distanceKm(centre, p) } : null;
      })
    );
    const near = placed
      .filter((x): x is { id: Types.ObjectId; km: number } => !!x && x.km <= radius)
      .sort((a, b) => a.km - b.km)
      .slice(0, RESULT_LIMIT);
    const [summaries, open] = await Promise.all([
      loadHostSummaries(near.map((n) => n.id)),
      openStatusBy({ venue_id: new Types.ObjectId(venueId), host_user_id: { $in: near.map((n) => n.id) } }, 'host_user_id'),
    ]);
    return near
      .map((n) => {
        const host = summaries.get(String(n.id));
        return host ? { ...host, distance_km: round1(n.km), open_request_status: open.get(String(n.id)) ?? null } : null;
      })
      .filter(Boolean);
  },

  /** Host Studio: approved venues within the radius of the selected location, nearest first. */
  async nearbyVenues(callerId: string, args: NearbyArgs) {
    await assertActiveHost(callerId);
    const centre = await centreOf(args);
    const radius = radiusOf(args.radius_km);
    const venues = await VenueModel.find({
      status: 'APPROVED',
      is_active: true,
      owner_user_id: { $ne: new Types.ObjectId(callerId) },
      ...categoryMatch('venue_category', validIds(args.category_ids)),
    })
      .select('lat lng location_id locality')
      .limit(CANDIDATE_LIMIT)
      .lean<(VenuePlace & { _id: Types.ObjectId })[]>();
    const resolve = pointResolver();
    const placed = await Promise.all(
      venues.map(async (v) => {
        const p = await venuePoint(v, resolve);
        return p ? { id: v._id, km: distanceKm(centre, p) } : null;
      })
    );
    const near = placed
      .filter((x): x is { id: Types.ObjectId; km: number } => !!x && x.km <= radius)
      .sort((a, b) => a.km - b.km)
      .slice(0, RESULT_LIMIT);
    const [summaries, open] = await Promise.all([
      loadVenueSummaries(near.map((n) => n.id)),
      openStatusBy({ host_user_id: new Types.ObjectId(callerId), venue_id: { $in: near.map((n) => n.id) } }, 'venue_id'),
    ]);
    return near
      .map((n) => {
        const venue = summaries.get(String(n.id));
        return venue ? { ...venue, distance_km: round1(n.km), open_request_status: open.get(String(n.id)) ?? null } : null;
      })
      .filter(Boolean);
  },
};
