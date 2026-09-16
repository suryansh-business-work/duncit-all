import { buildOfficialStatusSlides, type OfficialStatusSource } from '@duncit/utils';

import type { StatusGroup, StatusSlide } from '@/hooks/useStatus';

/** Duncit's own pinned group: a story group like any other, marked `official` so
 * the viewer names its parts with the official test ids. */
export type OfficialStory = StatusGroup & { official: true };

/**
 * Turn the live Duncit statuses into the one group pinned at the head of the
 * rail. RN twin of mWeb's official entry: both build their slides with
 * `buildOfficialStatusSlides`, so a caption, a link or an expiry can never mean
 * one thing on the phone and another in the browser (rule 27).
 *
 * Built from the server's answer alone, so the group the open viewer is playing
 * keeps its identity while a slide is being recorded as watched — the rail's
 * own seen set greys the ring, exactly as it does for every other tile.
 * Returns null when nothing is live, and the rail then renders no tile at all.
 */
export function buildOfficialStory(
  statuses: readonly OfficialStatusSource[],
  name: string,
): OfficialStory | null {
  const slides: StatusSlide[] = buildOfficialStatusSlides(statuses).map((slide) => ({
    id: slide.id,
    imageUrl: slide.mediaUrl,
    mediaType: slide.mediaType,
    caption: slide.caption || null,
    linkUrl: slide.linkUrl || null,
    expiresAt: slide.expiresAt,
    seenByMe: slide.seen,
    // A Duncit status is not somebody's post: there is nothing to like.
    likedByMe: false,
    likesCount: 0,
  }));
  // Newest first, as the server answered — the freshest message plays first and
  // is the one the tile shows.
  const cover = slides[0];
  if (!cover) return null;
  // The tile is a circle, and it has no video player: the newest IMAGE slide is
  // its picture, and a group of videos falls back to the "D" initial.
  const poster = slides.find((slide) => slide.mediaType === 'IMAGE');
  return {
    authorId: 'official-status',
    name,
    photo: poster?.imageUrl ?? null,
    slides,
    cover,
    official: true,
  };
}
