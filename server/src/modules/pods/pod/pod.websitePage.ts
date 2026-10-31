/**
 * A pod's page as a search engine reads it, and the list of pod pages to read.
 *
 * mWeb's HTML server writes this into the pod page before the SPA loads: the
 * heading and text a crawler indexes, and a schema.org Event. Unauthenticated,
 * so it carries only what the pod page already shows any visitor — what, when,
 * where (venue name and area, never an address line), the club, the price and
 * whether seats are left — and nothing about members or hosts. The pods are the
 * ones a public surface may show (PUBLIC_POD_FILTER); past ones still have a
 * page, the sitemap lists only those still to come.
 */
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { PodModel } from './pod.model';
import { podSeatsAvailable } from './pod.seats';
import { loadClubSlugMap } from './pod.shared';
import { PUBLIC_POD_FILTER } from './pod.websiteRail';

/** Tickets are charged in rupees (payment.service creates every pod order in INR). */
const TICKET_CURRENCY = 'INR';
const MAX_DESCRIPTION = 2000;
const MAX_IMAGES = 5;
/** Far more than Duncit has upcoming; one sitemap file holds 50,000. */
const SITEMAP_LIMIT = 5000;

interface MediaItem {
  url?: string | null;
  type?: string | null;
}

interface PagePodDoc {
  _id: unknown;
  pod_id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_date_time: Date;
  pod_end_date_time?: Date | null;
  pod_mode?: string | null;
  pod_type: string;
  pod_amount?: number | null;
  pod_images_and_videos?: MediaItem[];
  zone_name?: string | null;
  venue_id?: unknown;
  location_id?: unknown;
  no_of_spots?: number | null;
  pod_attendees?: unknown[] | null;
  extra_seats?: number | null;
}

/** Authored rich text as one plain run of words. */
const plain = (value: unknown, max: number): string =>
  typeof value === 'string'
    ? value
        .replaceAll(/<[^>]*>?/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : '';

const images = (media: unknown): string[] =>
  Array.isArray(media)
    ? (media as MediaItem[])
        .filter((m) => m?.url && (m.type ?? 'IMAGE') === 'IMAGE')
        .map((m) => String(m.url))
        .slice(0, MAX_IMAGES)
    : [];

/** The venue's name and area, and the city — what the pod page names, not the street. */
async function placeOf(doc: PagePodDoc) {
  const [venue, location] = await Promise.all([
    doc.venue_id ? VenueModel.findById(doc.venue_id).select('venue_name locality city state country_code').lean() : null,
    doc.location_id ? LocationModel.findById(doc.location_id).select('city state country_code').lean() : null,
  ]);
  return {
    venue_name: venue?.venue_name || null,
    locality: venue?.locality || doc.zone_name || null,
    city: venue?.city || location?.city || null,
    region: venue?.state || location?.state || null,
    country_code: venue?.country_code || location?.country_code || null,
  };
}

export async function websitePodPage(clubSlug: string, podSlug: string) {
  const club = await ClubModel.findOne({ club_id: clubSlug.toLowerCase(), is_hidden: { $ne: true } })
    .select('club_id club_name')
    .lean();
  if (!club) return null;
  const doc = await PodModel.findOne({ ...PUBLIC_POD_FILTER, club_id: club._id, pod_id: podSlug.toLowerCase() })
    .select(
      'pod_id pod_title pod_description pod_date_time pod_end_date_time pod_mode pod_type pod_amount pod_images_and_videos zone_name venue_id location_id no_of_spots pod_attendees extra_seats'
    )
    .lean<PagePodDoc>();
  if (!doc) return null;
  const capped = (doc.no_of_spots ?? 0) > 0;
  return {
    title: doc.pod_title,
    description: plain(doc.pod_description, MAX_DESCRIPTION),
    start: new Date(doc.pod_date_time).toISOString(),
    end: doc.pod_end_date_time ? new Date(doc.pod_end_date_time).toISOString() : null,
    virtual: doc.pod_mode === 'VIRTUAL',
    image_urls: images(doc.pod_images_and_videos),
    price: doc.pod_type === 'FREE' ? 0 : doc.pod_amount ?? 0,
    currency: TICKET_CURRENCY,
    // A pod with no capacity of its own never sells out.
    sold_out: capped && podSeatsAvailable(doc) === 0,
    club_name: club.club_name,
    club_slug: club.club_id,
    canonical_path: `/club/${club.club_id}/pod/${doc.pod_id}`,
    ...(await placeOf(doc)),
  };
}

/** Every pod page still to come, for mWeb's sitemap.xml. */
export async function websitePodSitemap() {
  const docs = await PodModel.find({ ...PUBLIC_POD_FILTER, pod_date_time: { $gt: new Date() } })
    .sort({ pod_date_time: 1 })
    .limit(SITEMAP_LIMIT)
    .select('pod_id club_id updated_at')
    .lean<{ pod_id: string; club_id?: unknown; updated_at?: Date | null }[]>();
  const clubSlugs = await loadClubSlugMap(docs);
  return docs.flatMap((doc) => {
    const clubSlug = doc.club_id ? clubSlugs.get(String(doc.club_id)) : undefined;
    if (!clubSlug) return [];
    return [{ path: `/club/${clubSlug}/pod/${doc.pod_id}`, updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null }];
  });
}
