const isDevelopment = import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

// Localhost targets in dev, production hosts otherwise — every cross-site
// link goes through this map so environments never leak into each other.
const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      siteUrl: 'http://localhost:2004',
      mainSiteUrl: 'http://localhost:2000',
      partnersAppUrl: 'http://localhost:2005',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      siteUrl: 'https://partners.duncit.com',
      mainSiteUrl: 'https://duncit.com',
      partnersAppUrl: 'https://partners-app.duncit.com',
    };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.PUBLIC_GRAPHQL_URL || urls.graphqlUrl,
  siteUrl: import.meta.env.PUBLIC_PARTNERS_SITE_URL || urls.siteUrl,
  mainSiteUrl: import.meta.env.PUBLIC_MAIN_SITE_URL || urls.mainSiteUrl,
  partnersAppUrl: import.meta.env.PUBLIC_PARTNERS_APP_URL || urls.partnersAppUrl,
};
