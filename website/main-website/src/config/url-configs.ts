const isDevelopment = import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

// Localhost targets in dev, production hosts otherwise — every cross-site
// link goes through this map so environments never leak into each other.
const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      siteUrl: 'http://localhost:2000',
      mwebUrl: 'http://localhost:2003',
      partnersSiteUrl: 'http://localhost:2004',
      adsSiteUrl: 'http://localhost:2020',
      earnwithUrl: 'http://localhost:2025',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      siteUrl: 'https://duncit.com',
      mwebUrl: 'https://mweb.duncit.com',
      partnersSiteUrl: 'https://partners.duncit.com',
      adsSiteUrl: 'https://ads.duncit.com',
      earnwithUrl: 'https://earnwith.duncit.com',
    };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.PUBLIC_GRAPHQL_URL || urls.graphqlUrl,
  siteUrl: import.meta.env.PUBLIC_SITE_URL || urls.siteUrl,
  mwebUrl: import.meta.env.PUBLIC_MWEB_URL || urls.mwebUrl,
  partnersSiteUrl: import.meta.env.PUBLIC_PARTNERS_SITE_URL || urls.partnersSiteUrl,
  adsSiteUrl: import.meta.env.PUBLIC_ADS_SITE_URL || urls.adsSiteUrl,
  earnwithUrl: import.meta.env.PUBLIC_EARNWITH_URL || urls.earnwithUrl,
  emails: {
    support: 'support@duncit.com',
  },
};
