import type { CatalogueFlow } from './catalogue.types';
import { ADMIN_FLOWS } from './admin';
import { APP_ACCOUNT_FLOWS } from './app-account';
import { APP_POD_FLOWS } from './app-pods';
import { APP_SOCIAL_COMMERCE_FLOWS } from './app-social-commerce';
import { APP_STUDIO_FLOWS } from './app-studios';
import { PARTNER_PORTAL_FLOWS } from './partner-portals';
import { STAFF_OPS_PORTAL_FLOWS } from './staff-ops-portals';
import { STAFF_OTHER_PORTAL_FLOWS } from './staff-other-portals';
import { WEBSITE_SERVER_FLOWS } from './websites-server';

/**
 * Every journey the codebase ships, as Tech > E2E Tests > Flows documents it:
 * the customer app (mWeb + native, one entry per journey), each portal, the
 * websites and the server's own scheduled and webhook flows. A surface or
 * journey added to the code gets its entry here, and the next boot seeds it.
 */
export const E2E_FLOW_CATALOGUE: readonly CatalogueFlow[] = [
  ...APP_ACCOUNT_FLOWS,
  ...APP_POD_FLOWS,
  ...APP_SOCIAL_COMMERCE_FLOWS,
  ...APP_STUDIO_FLOWS,
  ...ADMIN_FLOWS,
  ...PARTNER_PORTAL_FLOWS,
  ...STAFF_OPS_PORTAL_FLOWS,
  ...STAFF_OTHER_PORTAL_FLOWS,
  ...WEBSITE_SERVER_FLOWS,
];
