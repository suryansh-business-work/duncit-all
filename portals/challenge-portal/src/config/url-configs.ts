// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. Local development points at localhost and
// production builds point at the production server. Override via
// VITE_GRAPHQL_URL when needed (e.g. Cypress e2e builds).
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql' }
  : { graphqlUrl: 'https://server.duncit.com/graphql' };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl,
};
