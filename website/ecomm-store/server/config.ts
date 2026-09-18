import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Everything the HTML server reads from its environment, with production defaults. */
const envOr = (name: string, fallback: string): string => {
  const value = (process.env[name] ?? '').trim();
  return value === '' ? fallback : value;
};

export const PORT = Number.parseInt(envOr('PORT', '8080'), 10);

export const GRAPHQL_URL = envOr('GRAPHQL_URL', 'https://server.duncit.com/graphql');

/** A URL without the slashes it may end with. */
const withoutTrailingSlashes = (url: string): string => {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
};

export const SITE_URL = withoutTrailingSlashes(envOr('SITE_URL', 'https://ecomm.duncit.com'));

/** The built SPA sits beside this bundle: dist-server/main.mjs → ../dist. */
export const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/** How long an answer from the API is reused before asking again. */
export const API_TTL_MS = 60_000;

export const API_TIMEOUT_MS = 2500;
