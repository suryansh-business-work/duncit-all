// Vite sets `import.meta.env.DEV` automatically: true during `vite dev`,
// false during `vite build`. This means local development always points at
// localhost and production builds always point at the production server,
// without needing a per-app .env file. The URL can still be overridden via
// VITE_GRAPHQL_URL for special setups.
const isDevelopment = import.meta.env.DEV;

const fallback = isDevelopment
  ? {
      graphqlUrl: 'http://localhost:2001/graphql',
      loyaltyUrl: 'http://localhost:2047',
      mwebUrl: 'http://localhost:2003',
      adminUrl: 'http://localhost:2002',
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      loyaltyUrl: 'https://loyalty.duncit.com',
      mwebUrl: 'https://mweb.duncit.com',
      adminUrl: 'https://admin.duncit.com',
    };

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl;

// The staging build only bakes in its API URL, so the sibling console it links
// to follows that: a staging Finance must never send someone to production.
const isStagingApi = graphqlUrl.includes('://staging.');
const stagingLoyaltyUrl = isStagingApi ? 'https://staging.loyalty.duncit.com' : '';
const stagingMwebUrl = isStagingApi ? 'https://staging.mweb.duncit.com' : '';
const stagingAdminUrl = isStagingApi ? 'https://staging.admin.duncit.com' : '';

export const urlConfigs = {
  isDevelopment,
  graphqlUrl,
  // Duncit Coin, gift cards and referrals moved to the Loyalty console.
  loyaltyUrl: import.meta.env.VITE_LOYALTY_URL || stagingLoyaltyUrl || fallback.loyaltyUrl,
  // A rental's pod opens on mWeb; its guest's profile is the Admin console's user page.
  mwebUrl: import.meta.env.VITE_MWEB_URL || stagingMwebUrl || fallback.mwebUrl,
  adminUrl: import.meta.env.VITE_ADMIN_URL || stagingAdminUrl || fallback.adminUrl,
};
