const isDevelopment = import.meta.env.VITE_IS_DEVELOPMENT === 'true';

const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      appUrl: 'http://localhost:2005',
      mwebUrl: 'http://localhost:2003',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      appUrl: 'https://partners.duncit.com',
      mwebUrl: 'https://mweb.duncit.com',
    };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || urls.graphqlUrl,
  appUrl: import.meta.env.VITE_PARTNERS_APP_URL || urls.appUrl,
  mwebUrl: import.meta.env.VITE_MWEB_URL || urls.mwebUrl,
};
