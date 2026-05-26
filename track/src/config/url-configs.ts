// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. This means local development always points at
// localhost and production builds always point at the production server,
// without needing a per-app .env file. Each URL can still be overridden via
// VITE_GRAPHQL_URL / VITE_APP_URL for special setups.
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql', appUrl: 'http://localhost:2008' }
  : { graphqlUrl: 'https://server.duncit.com/graphql', appUrl: 'https://track.duncit.com' };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl,
  appUrl: import.meta.env.VITE_APP_URL || fallback.appUrl,
};
