import { YOUTUBE_URL } from '@duncit/regex';

import { videoSourceUrl } from '@duncit/utils';

/**
 * A venue's or a dish's video, as every surface plays it (rules 27/40).
 *
 * Owners add either an uploaded clip (the ImageKit video pipeline) or a
 * YouTube link; both are stored as plain strings in the same list. The kind is
 * read from the address — a YouTube link matches `YOUTUBE_URL` from
 * @duncit/regex, everything else is a file a `<video>` (or expo-video) plays.
 */

/** A YouTube link: what the embedded player loads, where the link opens, and a still to show before it plays. */
export interface YoutubeVideo {
  kind: 'YOUTUBE';
  /** The address as stored. */
  url: string;
  id: string;
  /** For an iframe / WebView — privacy-enhanced, so nothing is tracked until the guest presses play. */
  embedUrl: string;
  /** For "open in YouTube". */
  watchUrl: string;
  thumbnailUrl: string;
}

/** An uploaded clip: the address to hand a player (the stored file, never a metered re-encode). */
export interface FileVideo {
  kind: 'FILE';
  url: string;
  sourceUrl: string;
}

export type VenueVideo = YoutubeVideo | FileVideo;

/** The 11-character id of a YouTube video link, or null for anything else. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  return YOUTUBE_URL.exec((url ?? '').trim())?.[1] ?? null;
}

/** How one stored video plays. Null for a blank entry. */
export function venueVideoOf(url: string | null | undefined): VenueVideo | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  const id = youtubeVideoId(raw);
  if (id) {
    return {
      kind: 'YOUTUBE',
      url: raw,
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  return { kind: 'FILE', url: raw, sourceUrl: videoSourceUrl(raw) };
}

/** Every playable video of a list, blanks dropped, in the owner's order. */
export const venueVideosOf = (urls: readonly (string | null | undefined)[] | null | undefined): VenueVideo[] =>
  (urls ?? []).map(venueVideoOf).filter((video): video is VenueVideo => video !== null);

/** The ImageKit folder an owner's uploaded venue and dish videos are filed under (the server adds the venue id). */
export const VENUE_VIDEO_FOLDER = '/venues';
