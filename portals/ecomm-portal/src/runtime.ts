import { createPortalRuntime, resolvePortalGraphqlUrl } from '@duncit/shell';
import { appConfig } from './config/app-config';

/** The API the pet store console reads and writes. */
export const graphqlUrl = resolvePortalGraphqlUrl(import.meta.env);

/** The Apollo client, session, chrome and login page, wired to this console. */
export const runtime = createPortalRuntime(appConfig, graphqlUrl);

/** The storefront this console manages — for "View on store" links. */
export const STORE_URL = (import.meta.env.VITE_STORE_URL || 'https://ecomm.duncit.com').replace(/\/+$/, '');

/** The Support console, where the store's shopper tickets land. */
export const SUPPORT_URL = (import.meta.env.VITE_SUPPORT_URL || 'https://support.duncit.com').replace(/\/+$/, '');
