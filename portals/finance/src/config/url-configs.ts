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
    }
  : {
      graphqlUrl: 'https://server.duncit.com/graphql',
      loyaltyUrl: 'https://loyalty.duncit.com',
    };

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || fallback.graphqlUrl;

// The staging build only bakes in its API URL, so the sibling console it links
// to follows that: a staging Finance must never send someone to production.
const stagingLoyaltyUrl = graphqlUrl.includes('://staging.') ? 'https://staging.loyalty.duncit.com' : '';

export const urlConfigs = {
  isDevelopment,
  graphqlUrl,
  // Duncit Coin, gift cards and referrals moved to the Loyalty console.
  loyaltyUrl: import.meta.env.VITE_LOYALTY_URL || stagingLoyaltyUrl || fallback.loyaltyUrl,
};
