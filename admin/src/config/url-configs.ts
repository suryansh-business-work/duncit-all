const isDevelopment = import.meta.env.VITE_IS_DEVELOPMENT === 'true';

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
