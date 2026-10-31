// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. Local development points at localhost and
// production builds point at the production server. Override via
// VITE_GRAPHQL_URL when needed (e.g. Cypress e2e builds).
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql', marketingUrl: 'http://localhost:2015' }
  : { graphqlUrl: 'https://server.duncit.com/graphql', marketingUrl: 'https://marketing.duncit.com' };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl,
  // The Marketing console, where Reel Studio now lives; the same defaults the
  // server's url-configs carry. Override via VITE_MARKETING_URL.
  marketingUrl: import.meta.env.VITE_MARKETING_URL || fallback.marketingUrl,
};
