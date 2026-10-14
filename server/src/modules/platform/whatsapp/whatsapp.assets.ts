import { firstImageUrl, type StoredMedia } from '@utils/media';
import { mediaPair, type SendAssets } from './whatsapp.media';

/**
 * The assets a message about a POD has of its own.
 *
 * Every pod-shaped scenario — booked, reminded, filled, cancelled, rated —
 * is about one pod, and that pod already carries the pictures that advertised
 * it. Attaching one is the difference between a reminder that shows the thing
 * you signed up for and a reminder headed by whatever placeholder the platform
 * default happens to hold.
 *
 * A pod with no picture yields a null asset, which is not a failure: the send
 * path falls through to the rungs below it exactly as it always did.
 *
 * Only IMAGE. A pod's media list can hold videos, and a video is not a still
 * picture — see `firstImageUrl`. A pod-shaped message that also has a document
 * of its own (a booking has its ticket) spreads this and adds `DOCUMENT`.
 */
export const podImageAssets = (media?: readonly StoredMedia[] | null): SendAssets => ({
  IMAGE: mediaPair(firstImageUrl(media)),
});

/** The fields {@link venueImageAssets} reads — select them, nothing else. */
export const VENUE_IMAGE_FIELDS = 'cover_image_url gallery';

/**
 * The assets a message about a VENUE has of its own: the first of `preferred`
 * that is set (a dish photo, say), else the venue's cover, else the first
 * picture in its gallery — the order the venue's public page and its link
 * preview already pick in. Nothing set yields a null asset, which falls
 * through to the platform default like any other send.
 */
export const venueImageAssets = (
  venue?: { cover_image_url?: string | null; gallery?: readonly string[] | null } | null,
  ...preferred: (string | null | undefined)[]
): SendAssets => {
  const candidates = [...preferred, venue?.cover_image_url, ...(venue?.gallery ?? [])];
  const url = candidates.map((candidate) => (candidate ?? '').trim()).find(Boolean) ?? '';
  return { IMAGE: mediaPair(url) };
};
