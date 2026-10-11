import { urlConfigs } from './url-configs';

/**
 * The vendor pages a brand partner needs while connecting ShipRocket and
 * Razorpay (Integration step). One place, so a page the vendor moves is one edit.
 */
export const INTEGRATION_LINKS = {
  SHIPROCKET: {
    openApi: 'https://app.shiprocket.in/sellers/settings/additional-settings/api-users',
    signup: 'https://app.shiprocket.in/register',
    docs: 'https://apidocs.shiprocket.in/',
    /** Where ShipRocket shows the sandbox API user — the credentials a connection in sandbox mode uses. */
    sandbox: 'https://app.shiprocket.in/seller/settings/additional-settings/sandbox',
  },
  RAZORPAY: {
    openApi: 'https://dashboard.razorpay.com/app/website-app-settings/api-keys',
    signup: 'https://dashboard.razorpay.com/signup',
    docs: 'https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/',
  },
} as const;

/** Where ShipRocket posts tracking updates: the API server's own origin (server route `/webhooks/courier-updates`). */
export const shiprocketWebhookUrl = (graphqlUrl: string = urlConfigs.graphqlUrl): string =>
  `${new URL(graphqlUrl).origin}/webhooks/courier-updates`;
