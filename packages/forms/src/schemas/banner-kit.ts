import { z } from 'zod';
import { HEX_COLOR, INSTAGRAM_HANDLE } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * A venue's or a host's banner kit — what their pod banners are made from —
 * as every portal form edits it. The numbers are the server's
 * (`bannerKit.rules` BANNER_KIT_LIMITS); the server checks again and decides.
 */
export const BANNER_KIT_LIMITS = {
  photos: 12,
  eventPhotos: 12,
  caption: 120,
  tagline: 80,
  bio: 400,
} as const;

const INSTAGRAM_ADDRESS = 'instagram.com/';
/** Where an account name inside a pasted link ends. */
const HANDLE_END = new Set(['/', '?', '#', ' ']);

/**
 * An Instagram handle as Duncit stores it: trimmed, lowercase, the `@` and any
 * `https://www.instagram.com/…/` around it dropped — the server's
 * `normalizeInstagramHandle`, so a pasted profile link is accepted as typed.
 */
export function normalizeInstagramHandle(raw: string): string {
  let text = raw.trim().toLowerCase();
  const at = text.indexOf(INSTAGRAM_ADDRESS);
  if (at >= 0) {
    const rest = [...text.slice(at + INSTAGRAM_ADDRESS.length)];
    const end = rest.findIndex((char) => HANDLE_END.has(char));
    text = (end < 0 ? rest : rest.slice(0, end)).join('');
  }
  while (text.startsWith('@')) text = text.slice(1);
  return text;
}

/** '' or an Instagram username ({@link INSTAGRAM_HANDLE}) once normalised. */
export const isInstagramHandleEntry = (raw: string): boolean => {
  const handle = normalizeInstagramHandle(raw);
  return handle === '' || INSTAGRAM_HANDLE.test(handle);
};

/** '' or `#rrggbb` — the banner renderer paints with six digits, not the `#rgb` short form. */
export const isBrandColorEntry = (raw: string): boolean => raw === '' || (raw.length === 7 && HEX_COLOR.test(raw));

export function makeBannerKitSchema(t: Translate) {
  const photo = z.object({
    url: z.string().min(1),
    caption: z
      .string()
      .trim()
      .max(BANNER_KIT_LIMITS.caption, t('shell.bannerKit.errors.captionMax', { vars: { max: BANNER_KIT_LIMITS.caption } })),
  });
  const photoList = (max: number) =>
    z.array(photo).max(max, t('shell.bannerKit.errors.photosMax', { vars: { max } }));
  return z.object({
    logo_url: z.string(),
    instagram_handle: z.string().trim().refine(isInstagramHandleEntry, t('shell.bannerKit.errors.handleInvalid')),
    collab_opt_in: z.boolean(),
    photos: photoList(BANNER_KIT_LIMITS.photos),
    event_photos: photoList(BANNER_KIT_LIMITS.eventPhotos),
    tagline: z
      .string()
      .trim()
      .max(BANNER_KIT_LIMITS.tagline, t('shell.bannerKit.errors.taglineMax', { vars: { max: BANNER_KIT_LIMITS.tagline } })),
    bio: z
      .string()
      .trim()
      .max(BANNER_KIT_LIMITS.bio, t('shell.bannerKit.errors.bioMax', { vars: { max: BANNER_KIT_LIMITS.bio } })),
    brand_color: z.string().trim().refine(isBrandColorEntry, t('shell.bannerKit.errors.colorInvalid')),
  });
}

/** What the form holds and what a save sends (`BannerKitInput`). */
export type BannerKitValues = z.output<ReturnType<typeof makeBannerKitSchema>>;
