const isDevelopment = import.meta.env.VITE_IS_DEVELOPMENT === 'true';

const fallback = isDevelopment
  ? { graphqlUrl: 'http://localhost:2001/graphql', appUrl: 'http://localhost:2006' }
  : { graphqlUrl: 'https://server.duncit.com/graphql', appUrl: 'https://ads.duncit.com' };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl,
  appUrl: import.meta.env.VITE_APP_URL || fallback.appUrl,
};
