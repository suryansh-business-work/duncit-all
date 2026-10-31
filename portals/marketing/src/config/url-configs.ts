// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. Local development points at localhost and
// production builds point at the production server. Override via
// VITE_GRAPHQL_URL when needed (e.g. Cypress e2e builds).
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql' }
  : { graphqlUrl: 'https://server.duncit.com/graphql' };

const graphqlUrl: string = import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl;

// A staging build only bakes in its API URL, so the app it links to follows
// that: a staging Marketing must never preview a look on production mWeb.
const isStagingApi = graphqlUrl.includes('://staging.');

/** Drops trailing slashes with a linear scan, so a long run of `/` can never backtrack. */
const withoutTrailingSlash = (url: string): string => {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
};

/** mWeb wears the occasion looks; Occasions opens a look there to preview it. */
const mwebFallback = (): string => {
  if (isDevelopment) return 'http://localhost:2003';
  return isStagingApi ? 'https://staging.mweb.duncit.com' : 'https://mweb.duncit.com';
};

export const urlConfigs = {
  isDevelopment,
  graphqlUrl,
  /** The member web app — where Occasions previews a look (`/?occasion=<key>`). */
  mwebUrl: withoutTrailingSlash(import.meta.env.VITE_MWEB_URL || mwebFallback()),
  /** The ecomm storefront (it has no staging host) — where the Ecomm Store tab previews its looks. */
  storeUrl: withoutTrailingSlash(import.meta.env.VITE_STORE_URL || 'https://ecomm.duncit.com'),
};
