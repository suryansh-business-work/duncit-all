// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. This means local development always points at
// localhost and production builds always point at the production server,
// without needing a per-app .env file. The URL can still be overridden via
// VITE_GRAPHQL_URL for special setups.
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql' }
  : { graphqlUrl: 'https://server.duncit.com/graphql' };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl,
};
