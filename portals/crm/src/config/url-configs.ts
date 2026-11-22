// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. This means local development always points at
// localhost and production builds always point at the production server,
// without needing a per-app .env file. The URL can still be overridden via
// VITE_GRAPHQL_URL for special setups (e.g. Cypress builds
// pass `VITE_GRAPHQL_URL=/graphql` so requests go same-origin and can be
// short-circuited by `cy.intercept()` without a CORS preflight detour).
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql' }
  : { graphqlUrl: 'https://server.duncit.com/graphql' };

const graphqlUrl: string = import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl;

// A staging build only bakes in its API URL, so the consoles it links to follow
// that: a staging CRM must never send someone to configure production Twilio.
const isStagingApi = graphqlUrl.includes('://staging.');

/** The Tech portal, where Twilio (and every other integration) is configured. */
const techFallback = (): string => {
  if (isDevelopment) return 'http://localhost:2009';
  return isStagingApi ? 'https://staging.tech.duncit.com' : 'https://tech.duncit.com';
};

/** Drops trailing slashes with a linear scan, so a long run of `/` can never backtrack. */
const withoutTrailingSlash = (url: string): string => {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
};

export const urlConfigs = {
  isDevelopment,
  graphqlUrl,
  /** Tech portal origin; its Environment page opens one integration with `/?section=<CATEGORY>`. */
  techUrl: withoutTrailingSlash(import.meta.env.VITE_TECH_URL || techFallback()),
};
