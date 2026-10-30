/**
 * The upcoming-pods rail every Duncit website shows under its home banner.
 *
 * Unauthenticated, so it hands out exactly what a pod card on a public page
 * needs — title, cover image, when, where (the area), the ticket price and the
 * two slugs mWeb's pod page is addressed by — and nothing about members,
 * hosts, venues or money beyond the price. The pods are the ones discovery
 * itself would offer: live, not deleted or hidden, not waiting on (or turned
 * down by) the venue, not a retired series parent, and still to come.
 */
import { POD_VISIBLE_FILTER } from '@utils/hidden';
import { PodModel } from './pod.model';
import { loadClubSlugMap } from './pod.shared';

/** How many pods a rail asks for by default, and the most it may ask for. */
const DEFAULT_RAIL_SIZE = 12;
const MAX_RAIL_SIZE = 24;

interface MediaItem {
  url?: string | null;
  type?: string | null;
}

/** The fields the rail selects, as `.lean()` hands them back. */
interface RailPodDoc {
  _id: unknown;
  pod_id: string;
  pod_title: string;
  pod_date_time: Date;
  pod_images_and_videos?: MediaItem[];
  zone_name?: string | null;
  pod_type: string;
  pod_amount?: number | null;
  club_id?: unknown;
}

/** First IMAGE of the pod's media — a card cannot play a video. */
const coverImage = (media: unknown): string | null => {
  if (!Array.isArray(media)) return null;
  return (media as MediaItem[]).find((m) => m?.url && (m.type ?? 'IMAGE') === 'IMAGE')?.url ?? null;
};

/**
 * The pods a public surface may show at all: live, not deleted or hidden, not
 * waiting on (or turned down by) the venue, and not a retired series parent.
 * The rail adds "still to come"; the pod page and the sitemap share the rest.
 */
export const PUBLIC_POD_FILTER = {
  is_active: true,
  deleted_at: null,
  venue_approval_status: { $nin: ['PENDING', 'DECLINED'] },
  series_role: { $ne: 'PARENT' },
  ...POD_VISIBLE_FILTER,
} as const;

export async function websiteUpcomingPods(limit?: number | null) {
  const size = Math.min(Math.max(Math.trunc(limit ?? DEFAULT_RAIL_SIZE), 1), MAX_RAIL_SIZE);
  const docs = await PodModel.find({ ...PUBLIC_POD_FILTER, pod_date_time: { $gt: new Date() } })
    .sort({ pod_date_time: 1 })
    .limit(size)
    .select('pod_id pod_title pod_date_time pod_images_and_videos zone_name pod_type pod_amount club_id')
    .lean<RailPodDoc[]>();
  const clubSlugs = await loadClubSlugMap(docs);
  // A pod without a club has no mWeb address, so it cannot be offered here.
  return docs.flatMap((doc) => {
    const clubSlug = doc.club_id ? clubSlugs.get(String(doc.club_id)) : undefined;
    if (!clubSlug) return [];
    return [
      {
        id: String(doc._id),
        pod_id: doc.pod_id,
        club_slug: clubSlug,
        pod_title: doc.pod_title,
        pod_date_time: new Date(doc.pod_date_time).toISOString(),
        image_url: coverImage(doc.pod_images_and_videos),
        zone_name: doc.zone_name ?? null,
        pod_type: doc.pod_type,
        pod_amount: doc.pod_amount ?? 0,
      },
    ];
  });
}
