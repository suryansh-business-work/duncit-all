import { isValidObjectId } from 'mongoose';
import { GraphQLError } from 'graphql';
import { getUrlConfigs } from '@config/url-configs';
import { PodModel, type IPod } from '@modules/pods/pod/pod.model';
import { resolvePodPlace } from '@modules/pods/pod/pod.place';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { readKit, usableUrls, type BannerKit } from './podPromo.kit';

/**
 * Everything a banner and a caption are made from, read once per pod: the
 * pod itself, its club, city and category names, the venue and the lead host
 * with their banner kits. Nothing here is invented — a field the pod does not
 * have is empty and the slide that needs it is left out.
 */
export interface PriceTier {
  /** Tickets bought together to get this price, e.g. 2 for a duo. */
  tickets: number;
  each: number;
}

export interface PartnerData {
  name: string;
  line: string;
  address: string;
  photo_url: string;
  kit: BannerKit;
}

export interface PodBannerData {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date | null;
  is_free: boolean;
  price: number;
  tiers: PriceTier[];
  includes: string[];
  place_label: string;
  place_detail: string;
  club_id: string;
  club_name: string;
  city_id: string;
  city_name: string;
  category_names: string[];
  photo_urls: string[];
  url: string;
  venue: PartnerData | null;
  host: PartnerData | null;
}

type LeanPod = IPod & { _id: { toString(): string } };

const notFound = () => new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

const clean = (values: readonly (string | null | undefined)[]) => [...new Set(values.map((v) => (v ?? '').trim()).filter(Boolean))];

/** Ticket tiers as prices: the solo price first, then each tier's per-ticket price. */
function tiersOf(pod: LeanPod): PriceTier[] {
  if (pod.pod_type !== 'PAID' || !pod.ticket_discount_enabled) return [];
  return (pod.ticket_discount_tiers ?? []).map((tier) => ({
    tickets: tier.min_tickets,
    each: Math.round(pod.pod_amount * (1 - tier.discount_pct / 100)),
  }));
}

async function categoryNames(categoryIds: readonly unknown[]): Promise<string[]> {
  const ids = categoryIds.filter((id) => id && isValidObjectId(String(id)));
  if (ids.length === 0) return [];
  const rows = await CategoryModel.find({ _id: { $in: ids } }).select('name').lean<{ name: string }[]>();
  return clean(rows.map((row) => row.name));
}

async function venueOf(venueId: unknown): Promise<PartnerData | null> {
  if (!venueId) return null;
  const venue = await VenueModel.findById(venueId).lean<Record<string, unknown>>();
  if (!venue) return null;
  const text = (key: string) => (typeof venue[key] === 'string' ? String(venue[key]).trim() : '');
  const gallery = Array.isArray(venue.gallery) ? venue.gallery.map(String) : [];
  const kit = readKit(venue.banner_kit);
  return {
    name: text('venue_name'),
    line: kit.tagline,
    address: clean([text('address_line1'), text('locality'), text('city')]).join(', '),
    photo_url: usableUrls([...kit.photo_urls, text('cover_image_url'), ...gallery])[0] ?? '',
    kit,
  };
}

interface LeanUser {
  profile?: { first_name?: string; last_name?: string; profile_photo?: string; bio?: string };
}

async function hostOf(userId: unknown): Promise<PartnerData | null> {
  if (!userId) return null;
  const [user, host] = await Promise.all([
    UserModel.findById(userId).select('profile.first_name profile.last_name profile.profile_photo profile.bio').lean<LeanUser>(),
    HostModel.findOne({ user_id: userId }).lean<Record<string, unknown>>(),
  ]);
  if (!user) return null;
  const kit = readKit(host?.banner_kit);
  const profile = user.profile ?? {};
  return {
    name: clean([profile.first_name, profile.last_name]).join(' '),
    line: kit.tagline || kit.bio || (profile.bio ?? '').trim(),
    address: '',
    photo_url: usableUrls([...kit.photo_urls, profile.profile_photo])[0] ?? '',
    kit,
  };
}

async function podPageUrl(pod: LeanPod, clubSlug: string | null): Promise<string> {
  const base = (await getUrlConfigs()).mwebUrl.replace(/\/+$/, '');
  return clubSlug ? `${base}/club/${clubSlug}/pod/${pod.pod_id}` : `${base}/pod/${pod.pod_id}`;
}

/** The pod as a banner sees it. Throws NOT_FOUND for a pod that does not exist or was deleted. */
export async function loadPodBannerData(podId: string): Promise<PodBannerData> {
  if (!isValidObjectId(podId)) throw notFound();
  const pod = await PodModel.findById(podId).lean<LeanPod>();
  if (!pod) throw notFound();
  const club = await ClubModel.findById(pod.club_id)
    .select('club_id club_name category_id super_category_id')
    .lean<{ club_id?: string; club_name?: string; category_id?: unknown; super_category_id?: unknown }>();
  const [place, location, categories, venue, host, url] = await Promise.all([
    resolvePodPlace({ ...pod }, {}),
    pod.location_id ? LocationModel.findById(pod.location_id).select('city location_name').lean<{ city?: string; location_name?: string }>() : null,
    categoryNames([club?.category_id, club?.super_category_id]),
    venueOf(pod.venue_id),
    hostOf(pod.pod_hosts_id?.[0]),
    podPageUrl(pod, club?.club_id ?? null),
  ]);
  const media = (pod.pod_images_and_videos ?? []).filter((item) => item.type === 'IMAGE').map((item) => item.url);
  return {
    id: String(pod._id),
    title: pod.pod_title.trim(),
    description: (pod.pod_description ?? '').trim(),
    start: new Date(pod.pod_date_time),
    end: pod.pod_end_date_time ? new Date(pod.pod_end_date_time) : null,
    is_free: pod.pod_type === 'FREE' || !pod.pod_amount,
    price: pod.pod_amount ?? 0,
    tiers: tiersOf(pod),
    includes: clean([...(pod.what_this_pod_offers ?? []), ...(pod.available_perks ?? [])]),
    place_label: place.label ?? '',
    place_detail: place.detail ?? '',
    club_id: pod.club_id ? String(pod.club_id) : '',
    club_name: club?.club_name ?? '',
    city_id: pod.location_id ? String(pod.location_id) : '',
    city_name: (location?.city || location?.location_name || '').trim(),
    category_names: categories,
    photo_urls: usableUrls([...media, venue?.photo_url]),
    url,
    venue: venue && venue.name ? venue : null,
    host: host && host.name ? host : null,
  };
}
