import { useEffect } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

import type { StoreActiveOccasion } from '../../graphql/settings';
import { useStoreSettings } from '../providers/StoreSettingsProvider';

const ICON_TYPES: Record<string, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** The MIME type a favicon link declares, from the URL's extension; '' when unknown. */
function iconType(url: string): string {
  const path = url.split(/[?#]/)[0] ?? '';
  const dot = path.lastIndexOf('.');
  if (dot === -1) return '';
  return ICON_TYPES[path.slice(dot + 1).toLowerCase()] ?? '';
}

/** Write the favicon into the document head, creating the link when the shell has none. */
function setFavicon(href: string): void {
  const doc = globalThis.document;
  if (!doc) return;
  let link = doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = doc.createElement('link');
    link.rel = 'icon';
    doc.head.append(link);
  }
  link.href = href;
  const type = iconType(href);
  if (type) {
    link.type = type;
  } else {
    link.removeAttribute('type');
  }
}

/** The page background an occasion paints: its colour, and its picture fixed behind the scroll. */
function backgroundOf(occasion: StoreActiveOccasion | null): SxProps<Theme> {
  const sx: Record<string, string> = {};
  if (occasion?.background_color) sx.bgcolor = occasion.background_color;
  if (occasion?.background_url) {
    sx.backgroundImage = `url("${occasion.background_url}")`;
    sx.backgroundSize = 'cover';
    sx.backgroundAttachment = 'fixed';
    sx.backgroundPosition = 'center';
  }
  return sx;
}

/**
 * The store's look from settings: the favicon (the occasion's while one is on,
 * else the store's own) and the occasion's page background. Mounted once, in
 * the shell. Every document access is guarded, so a server render is a no-op.
 */
export function useStoreBranding(): { backgroundSx: SxProps<Theme> } {
  const { favicon_url: storeFavicon, active_occasion: occasion } = useStoreSettings();
  const favicon = occasion?.favicon_url || storeFavicon;
  useEffect(() => {
    if (favicon) setFavicon(favicon);
  }, [favicon]);
  return { backgroundSx: backgroundOf(occasion) };
}
