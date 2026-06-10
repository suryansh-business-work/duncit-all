const isDevelopment = import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

const urls = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      siteUrl: 'http://localhost:2000',
      mwebUrl: 'http://localhost:2003',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      siteUrl: 'https://duncit.com',
      mwebUrl: 'https://mweb.duncit.com',
    };

export const urlConfigs = {
  isDevelopment,
  graphqlUrl: import.meta.env.PUBLIC_GRAPHQL_URL || urls.graphqlUrl,
  siteUrl: import.meta.env.PUBLIC_SITE_URL || urls.siteUrl,
  mwebUrl: import.meta.env.PUBLIC_MWEB_URL || urls.mwebUrl,
  emails: {
    hello: 'hello@duncit.com',
    press: 'press@duncit.com',
    support: 'support@duncit.com',
    safety: 'safety@duncit.com',
    privacy: 'privacy@duncit.com',
    legal: 'legal@duncit.com',
    careers: 'careers@duncit.com',
    security: 'security@duncit.com',
  },
};
