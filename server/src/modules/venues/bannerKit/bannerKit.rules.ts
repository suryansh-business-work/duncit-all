import { GraphQLError } from 'graphql';
import { isTrustedMediaUrl } from '@utils/url';
import { isInstagramHandle, normalizeInstagramHandle } from '@utils/social-handle';
import type { IBannerKit, IBannerKitPhoto } from './bannerKit.model';

/**
 * The banner kit's limits. The portals' form schema (`@duncit/forms/schemas`
 * bannerKit) carries the same numbers so a partner hears about a long bio as
 * they type; this is the copy that decides.
 */
export const BANNER_KIT_LIMITS = {
  photos: 12,
  eventPhotos: 12,
  caption: 120,
  tagline: 80,
  bio: 400,
} as const;

/** `#rrggbb` only: the banner renderer paints with it as is. */
const BRAND_COLOR = /^#[\da-f]{6}$/i;

export interface BannerKitPhotoInput {
  url?: string | null;
  caption?: string | null;
}

/** `BannerKitInput`: every field optional — a field left out keeps its stored value. */
export interface BannerKitInput {
  logo_url?: string | null;
  instagram_handle?: string | null;
  photos?: BannerKitPhotoInput[] | null;
  event_photos?: BannerKitPhotoInput[] | null;
  tagline?: string | null;
  bio?: string | null;
  brand_color?: string | null;
  collab_opt_in?: boolean | null;
}

const refuse = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** '' or an https address on the media store — never a host the server was pointed at. */
function mediaUrl(raw: string, what: string): string {
  const url = raw.trim();
  if (url && !isTrustedMediaUrl(url)) refuse(`${what} must be uploaded to the Duncit media library`);
  return url;
}

function boundedText(raw: string, max: number, what: string): string {
  const text = raw.trim();
  if (text.length > max) refuse(`${what} can be at most ${max} characters`);
  return text;
}

function photoList(raw: readonly BannerKitPhotoInput[], max: number, what: string): IBannerKitPhoto[] {
  if (raw.length > max) refuse(`Add at most ${max} ${what}`);
  return raw.map((photo) => {
    const url = mediaUrl(photo.url ?? '', 'Every photo');
    if (!url) refuse(`Every one of the ${what} needs a picture`);
    return { url, caption: boundedText(photo.caption ?? '', BANNER_KIT_LIMITS.caption, 'A photo caption') };
  });
}

function instagramHandle(raw: string): string {
  const handle = normalizeInstagramHandle(raw);
  if (handle && !isInstagramHandle(handle)) refuse('Enter the Instagram handle, for example duncit.events');
  return handle;
}

function brandColor(raw: string): string {
  const color = raw.trim().toLowerCase();
  if (color && !BRAND_COLOR.test(color)) refuse('The brand colour must look like #1a2b3c');
  return color;
}

/**
 * The stored kit with `input` applied: each field the caller sent is checked
 * and normalised, each field left out is kept. Throws BAD_USER_INPUT naming
 * the first field that is refused, so nothing is half-saved.
 */
export function applyBannerKitInput(current: IBannerKit, input: BannerKitInput): IBannerKit {
  return {
    logo_url: input.logo_url == null ? current.logo_url : mediaUrl(input.logo_url, 'The logo'),
    instagram_handle:
      input.instagram_handle == null ? current.instagram_handle : instagramHandle(input.instagram_handle),
    photos: input.photos == null ? current.photos : photoList(input.photos, BANNER_KIT_LIMITS.photos, 'photos'),
    event_photos:
      input.event_photos == null
        ? current.event_photos
        : photoList(input.event_photos, BANNER_KIT_LIMITS.eventPhotos, 'event photos'),
    tagline: input.tagline == null ? current.tagline : boundedText(input.tagline, BANNER_KIT_LIMITS.tagline, 'The tagline'),
    bio: input.bio == null ? current.bio : boundedText(input.bio, BANNER_KIT_LIMITS.bio, 'The bio'),
    brand_color: input.brand_color == null ? current.brand_color : brandColor(input.brand_color),
    collab_opt_in: input.collab_opt_in ?? current.collab_opt_in,
  };
}
