/**
 * The legacy marketing sites the CMS migration moves, and the domains each
 * answers on per environment. A domain only takes traffic once its DNS points
 * at the CMS renderer, so writing the staging/production names into the CMS
 * changes nothing on its own — the switch is the DNS change, later.
 */
export const LEGACY_SITES = [
  {
    key: 'main',
    name: 'Duncit',
    folder: 'main-website',
    legacy: 'MAIN',
    collections: ['BLOG', 'CAREER', 'NEWSLETTER', 'CASE_STUDY', 'NEWSROOM'],
    domains: {
      local: ['main.localhost'],
      staging: ['staging.duncit.com'],
      production: ['duncit.com', 'www.duncit.com'],
    },
  },
  {
    key: 'partners',
    name: 'Duncit Partners',
    folder: 'partners-website',
    legacy: 'PARTNERS',
    collections: [],
    domains: { local: ['partners.localhost'], staging: ['staging.partners.duncit.com'], production: ['partners.duncit.com'] },
  },
  {
    key: 'ads',
    name: 'Duncit Ads',
    folder: 'ads-website',
    legacy: 'ADS',
    collections: [],
    domains: { local: ['ads.localhost'], staging: ['staging.ads.duncit.com'], production: ['ads.duncit.com'] },
  },
  {
    key: 'earnwith',
    name: 'Earn with Duncit',
    folder: 'earnwith-website',
    legacy: 'EARNWITH',
    collections: [],
    domains: { local: ['earnwith.localhost'], staging: ['staging.earnwith.duncit.com'], production: ['earnwith.duncit.com'] },
  },
];

/** WebsiteContent types → CMS collections, for the content import. */
export const CONTENT_COLLECTIONS = { BLOG: 'BLOG', CAREERS: 'CAREER', NEWSROOM: 'NEWSROOM' };
