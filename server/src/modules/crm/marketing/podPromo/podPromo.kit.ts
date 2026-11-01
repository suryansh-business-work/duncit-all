import { z } from 'zod';
import { isTrustedMediaUrl } from '@utils/url';
import { isInstagramHandle, normalizeInstagramHandle } from '@utils/social-handle';

/**
 * A venue's or host's banner kit — what they gave marketing to put on a
 * banner — read defensively. Every field is optional here: a kit that was
 * never filled (or a document from before kits existed) reads as empty, and
 * the banner falls back to the venue's own photos and the host's avatar.
 */
const photo = z.object({ url: z.string().catch(''), caption: z.string().catch('') });
const kitSchema = z.object({
  logo_url: z.string().catch(''),
  instagram_handle: z.string().catch(''),
  photos: z.array(photo).catch([]),
  event_photos: z.array(photo).catch([]),
  tagline: z.string().catch(''),
  bio: z.string().catch(''),
  brand_color: z.string().catch(''),
  collab_opt_in: z.boolean().catch(true),
});

export interface BannerKit {
  logo_url: string;
  instagram_handle: string;
  photo_urls: string[];
  tagline: string;
  bio: string;
  /** Opted in to be invited as an Instagram collaborator. */
  collab_opt_in: boolean;
}

/** Only our CDN and the stock libraries: the server downloads these to compose the banner. */
const usable = (url: string | null | undefined): url is string => !!url && isTrustedMediaUrl(url.trim());

export const usableUrls = (urls: readonly (string | null | undefined)[]): string[] => [...new Set(urls.filter(usable).map((url) => url.trim()))];

/** The kit inside a lean document, or an empty one. */
export function readKit(raw: unknown): BannerKit {
  const parsed = kitSchema.safeParse(raw ?? {});
  const kit = parsed.success ? parsed.data : kitSchema.parse({});
  const handle = normalizeInstagramHandle(kit.instagram_handle);
  return {
    logo_url: usable(kit.logo_url) ? kit.logo_url.trim() : '',
    instagram_handle: isInstagramHandle(handle) ? handle : '',
    photo_urls: usableUrls([...kit.photos, ...kit.event_photos].map((item) => item.url)),
    tagline: kit.tagline.trim(),
    bio: kit.bio.trim(),
    collab_opt_in: kit.collab_opt_in,
  };
}

/** The handle to invite as a collaborator, when the partner opted in and has one. */
export const collabHandle = (kit: BannerKit): string | null => (kit.collab_opt_in && kit.instagram_handle ? kit.instagram_handle : null);
