import { isTrustedMediaUrl } from '@utils/url';
import { blankBannerKit, type IBannerKit, type IBannerKitPhoto } from './bannerKit.model';
import { BANNER_KIT_LIMITS } from './bannerKit.rules';

/** `BannerKit` as the API answers it. */
export interface BannerKitPub extends IBannerKit {
  suggested_photos: string[];
}

/** What a venue or a host already has on file that a kit can start from. */
export interface BannerKitSuggestions {
  /** The fallback logo: a venue's cover image, a host's own photo. */
  logo: string;
  /** Existing photos, best first. */
  photos: readonly string[];
}

const copyPhotos = (photos?: readonly IBannerKitPhoto[] | null): IBannerKitPhoto[] =>
  (photos ?? []).map((p) => ({ url: p.url ?? '', caption: p.caption ?? '' }));

/**
 * A plain copy of the stored kit, every field present — for a row saved before
 * kits existed (no `banner_kit` at all) as much as for a mongoose sub-document.
 */
export function toStoredBannerKit(kit?: Partial<IBannerKit> | null): IBannerKit {
  const blank = blankBannerKit();
  return {
    logo_url: kit?.logo_url ?? blank.logo_url,
    instagram_handle: kit?.instagram_handle ?? blank.instagram_handle,
    photos: copyPhotos(kit?.photos),
    event_photos: copyPhotos(kit?.event_photos),
    tagline: kit?.tagline ?? blank.tagline,
    bio: kit?.bio ?? blank.bio,
    brand_color: kit?.brand_color ?? blank.brand_color,
    collab_opt_in: kit?.collab_opt_in ?? blank.collab_opt_in,
  };
}

/** True while nobody has saved anything into the kit. */
function isUntouched(kit: IBannerKit): boolean {
  const blank = blankBannerKit();
  return (
    kit.logo_url === blank.logo_url &&
    kit.instagram_handle === blank.instagram_handle &&
    kit.photos.length === 0 &&
    kit.event_photos.length === 0 &&
    kit.tagline === blank.tagline &&
    kit.bio === blank.bio &&
    kit.brand_color === blank.brand_color
  );
}

/** Existing photos the kit may use: on the media store (the save checks it), each once, up to the limit. */
export function suggestedPhotos(urls: readonly string[]): string[] {
  return [...new Set(urls.map((url) => url.trim()).filter(isTrustedMediaUrl))].slice(0, BANNER_KIT_LIMITS.photos);
}

/**
 * The kit as the API answers it. A kit nobody has filled in yet reads as
 * prefilled from what is already on file — the logo and the photos — without
 * writing anything: the first save is what stores it. `suggested_photos` is
 * always there, so the form can offer them again with one click.
 */
export function toBannerKitPub(stored: Partial<IBannerKit> | null | undefined, from: BannerKitSuggestions): BannerKitPub {
  const kit = toStoredBannerKit(stored);
  const suggested = suggestedPhotos(from.photos);
  if (!isUntouched(kit)) return { ...kit, suggested_photos: suggested };
  return {
    ...kit,
    logo_url: suggestedPhotos([from.logo])[0] ?? '',
    photos: suggested.map((url) => ({ url, caption: '' })),
    suggested_photos: suggested,
  };
}
