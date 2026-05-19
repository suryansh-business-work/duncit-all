const isDevelopment = import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      siteUrl: 'http://localhost:2004',
      partnersAppUrl: 'http://localhost:2005',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      siteUrl: 'https://partners.duncit.com',
      partnersAppUrl: 'https://partners-app.duncit.com',
    };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.PUBLIC_GRAPHQL_URL || urls.graphqlUrl,
  siteUrl: import.meta.env.PUBLIC_PARTNERS_SITE_URL || urls.siteUrl,
  partnersAppUrl: import.meta.env.PUBLIC_PARTNERS_APP_URL || urls.partnersAppUrl,
};
