import { ECOMM_STORE_BUNDLE, flattenCatalogue } from '@duncit/i18n';

import { firstFilled } from '../src/lib/text';
import { STORE_PALETTES } from '../src/theme/tokens';

import { askApi } from './api';
import { SEO_SETTINGS, type SeoSettings } from './documents';

const COPY = flattenCatalogue(ECOMM_STORE_BUNDLE);
const copy = (key: string): string => COPY[key] ?? '';

/** The bundled marks in /public: PNGs at the sizes launchers require, plus the SVG for any other size. */
const BUNDLED_ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/duncit-logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
] as const;

/**
 * The web app manifest, written from the store's own settings so the installed
 * app carries the operator's name and description. Falls back to the bundled
 * copy when the API cannot answer.
 */
export async function manifestJson(): Promise<string> {
  const data = await askApi<{ storeSettings: SeoSettings }>(SEO_SETTINGS);
  const s = data?.storeSettings ?? null;
  const name = firstFilled(s?.store_name, copy('ecommStore.pwa.name'));
  const palette = STORE_PALETTES.light;
  return JSON.stringify({
    id: '/',
    name,
    short_name: name,
    description: firstFilled(s?.tagline, s?.seo_description, copy('ecommStore.pwa.description')),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: palette.page,
    background_color: palette.page,
    categories: ['shopping'],
    icons: BUNDLED_ICONS,
  });
}
