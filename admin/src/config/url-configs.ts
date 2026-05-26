// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. This means local development always points at
// localhost and production builds always point at the production server,
// without needing a per-app .env file. Each URL can still be overridden via
// VITE_GRAPHQL_URL / VITE_MWEB_URL for special setups.
const isDevelopment = import.meta.env.DEV;

const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      mwebUrl: 'http://localhost:2003',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      mwebUrl: 'https://mweb.duncit.com',
    };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || urls.graphqlUrl,
  mwebUrl: import.meta.env.VITE_MWEB_URL || urls.mwebUrl,
};
