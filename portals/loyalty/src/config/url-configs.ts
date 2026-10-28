import { resolvePortalGraphqlUrl } from '@duncit/shell';

/** The API this console talks to: the URL the build baked in, else the local
 * server under `vite dev`, else production. */
const graphqlUrl = resolvePortalGraphqlUrl(import.meta.env);

// A staging build only bakes in its API URL, so the sibling console it links to
// follows that: a staging Loyalty must never send someone to production Finance.
const isStagingApi = graphqlUrl.includes('://staging.');

const financeFallback = (): string => {
  if (import.meta.env.DEV) return 'http://localhost:2008';
  return isStagingApi ? 'https://staging.finance.duncit.com' : 'https://finance.duncit.com';
};

export const urlConfigs = {
  graphqlUrl,
  /** The Finance console — where the payment behind a virtual gift card lives. */
  financeUrl: import.meta.env.VITE_FINANCE_URL || financeFallback(),
};
