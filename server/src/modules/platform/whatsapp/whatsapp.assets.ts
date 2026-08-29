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
