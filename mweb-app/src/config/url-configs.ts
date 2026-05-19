const isDevelopment = import.meta.env.VITE_IS_DEVELOPMENT === 'true';

const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      appUrl: 'http://localhost:2003',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      appUrl: 'https://mweb.duncit.com',
    };

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || urls.graphqlUrl;
const apiBaseUrl = graphqlUrl.replace(/\/graphql\/?$/, '');

export const urlConfigs = {
  isDevelopment,
  graphqlUrl,
  apiBaseUrl,
  appUrl: import.meta.env.VITE_MWEB_URL || urls.appUrl,
};
