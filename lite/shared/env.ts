/**
 * Build-time configuration for both pages, read once. The API is same-origin
 * in production (nginx sends lite.* and lite-portal.* to this one service), so
 * the only value CI has to inject is the public site URL for links.
 */
const pick = (value: string | undefined, fallback: string): string => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? fallback : trimmed;
};

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

export const GRAPHQL_URL = pick(import.meta.env.VITE_LITE_GRAPHQL_URL, '/graphql');

export const SITE_URL = withoutTrailingSlash(pick(import.meta.env.VITE_LITE_SITE_URL, import.meta.env.PROD ? 'https://lite.duncit.com' : 'http://localhost:2041'));

export const PORTAL_URL = withoutTrailingSlash(pick(import.meta.env.VITE_LITE_PORTAL_URL, import.meta.env.PROD ? 'https://lite-portal.duncit.com' : 'http://portal.localhost:2041'));

/** The app key the API files this client under. */
export const APP_KEY = 'lite';

export const STORAGE_KEYS = {
  token: 'lite_token',
  colorMode: 'lite_color_mode',
  portalToken: 'lite_portal_token',
  portalColorMode: 'lite_portal_color_mode',
} as const;
