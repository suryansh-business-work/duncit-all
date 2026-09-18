/**
 * Build-time configuration, read once. Every value comes from a `VITE_*`
 * variable CI injects; the defaults only cover a local `vite dev` and a
 * production build that was not handed one.
 */
const pick = (value: string | undefined, fallback: string): string => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? fallback : trimmed;
};

const withoutTrailingSlash = (url: string): string => (url.endsWith('/') ? withoutTrailingSlash(url.slice(0, -1)) : url);

const DEFAULT_API = import.meta.env.PROD
  ? 'https://server.duncit.com/graphql'
  : 'http://localhost:2001/graphql';

export const GRAPHQL_URL = pick(import.meta.env.VITE_GRAPHQL_URL, DEFAULT_API);

/** Blank hides "Continue with Google" entirely. */
export const GOOGLE_CLIENT_ID = pick(import.meta.env.VITE_GOOGLE_CLIENT_ID, '');

export const MWEB_URL = withoutTrailingSlash(pick(import.meta.env.VITE_MWEB_URL, 'https://mweb.duncit.com'));

export const SIGNUP_URL = `${MWEB_URL}/signup`;

/** The app key the API's rate limiter and change log file this client under. */
export const APP_KEY = 'ecomm';

/** The store sells in India: every phone it collects is a 10-digit Indian mobile. */
export const DIAL_CODE = '+91';

/** And ships only within it. */
export const COUNTRY = 'India';
