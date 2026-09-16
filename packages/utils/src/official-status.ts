import { isStoryLive } from './story-live';

/**
 * One row of the apps' `officialStatuses` query — a status Duncit itself
 * published from Marketing > Status. Only the fields the two rails read.
 */
export interface OfficialStatusSource {
  id: string;
  media_url: string;
  media_type?: string | null;
  caption?: string | null;
  link_url?: string | null;
  /** Null means it never expires. */
  expires_at?: string | null;
  is_active?: boolean | null;
  seen_by_me?: boolean | null;
}

/**
 * One slide of the pinned Duncit group, in the shape mWeb and the native app
 * both render. The two rails share this derivation and nothing else: the MUI
 * and Tamagui views stay separate.
 */
export interface OfficialStatusSlide {
  id: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  /** Empty when the status carries no caption. */
  caption: string;
  /** Empty when the slide has no "See more" action. */
  linkUrl: string;
  /** True when linkUrl is an in-app path the router opens; false = external URL. */
  linkInternal: boolean;
  /** Already watched — the group's ring only lights while a slide is unseen. */
  seen: boolean;
  expiresAt: string | null;
}

/**
 * Whether a status still belongs in the rail.
 *
 * The server's read filter already drops the expired and switched-off ones;
 * this is the CLIENT's half, for the status that crosses its expiry while the
 * home screen stays open. `expires_at: null` is a status that never expires,
 * which `isStoryLive` already reads as live.
 */
export function isOfficialStatusLive(
  status: OfficialStatusSource,
  now: number = Date.now(),
): boolean {
  if (status.is_active === false) return false;
  return isStoryLive(status.expires_at, now);
}

/** The live statuses as rail slides, in the order the server answered (newest first). */
export function buildOfficialStatusSlides(
  statuses: readonly OfficialStatusSource[] | null | undefined,
  now: number = Date.now(),
): OfficialStatusSlide[] {
  return (statuses ?? [])
    .filter((status) => isOfficialStatusLive(status, now))
    .map((status): OfficialStatusSlide => {
      const linkUrl = status.link_url ?? '';
      return {
        id: status.id,
        mediaUrl: status.media_url,
        mediaType: status.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        caption: status.caption ?? '',
        linkUrl,
        // The server accepts an in-app path or an https URL; the leading slash
        // is what tells the two apps to navigate rather than leave.
        linkInternal: linkUrl.startsWith('/'),
        seen: status.seen_by_me === true,
        expiresAt: status.expires_at ?? null,
      };
    });
}

/** The Duncit ring lights while any slide of the group is unwatched. */
export function hasUnseenOfficialStatus(slides: readonly OfficialStatusSlide[]): boolean {
  return slides.some((slide) => !slide.seen);
}
