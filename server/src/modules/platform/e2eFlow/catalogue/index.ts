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
import { APP_GAP_FLOWS } from './gaps-apps';
import { OTHER_GAP_FLOWS } from './gaps-other';
import { PARTNER_GAP_FLOWS_A } from './gaps-partners-a';
import { PARTNER_GAP_FLOWS_B } from './gaps-partners-b';
import { STAFF_GAP_FLOWS } from './gaps-staff';

const nameKey = (name: string) => name.trim().toLowerCase();

/**
 * One entry per flow name. A later file may add sub flows to a flow another
 * file defines (same name) — they are appended, a sub flow already present by
 * name is kept as first written — so the seed never inserts the same flow twice.
 */
function mergeByName(flows: readonly CatalogueFlow[]): CatalogueFlow[] {
  const merged = new Map<string, CatalogueFlow>();
  for (const flow of flows) {
    const found = merged.get(nameKey(flow.name));
    if (!found) {
      merged.set(nameKey(flow.name), { ...flow, sub_flows: [...flow.sub_flows] });
      continue;
    }
    const known = new Set(found.sub_flows.map((sub) => nameKey(sub.name)));
    const added = flow.sub_flows.filter((sub) => !known.has(nameKey(sub.name)));
    merged.set(nameKey(flow.name), { ...found, sub_flows: [...found.sub_flows, ...added] });
  }
  return [...merged.values()];
}

/**
 * Every journey the codebase ships, as Tech > E2E Tests > Flows documents it:
 * the customer app (mWeb + native, one entry per journey), each portal, the
 * websites and the server's own scheduled and webhook flows. A surface or
 * journey added to the code gets its entry here, and the next boot seeds it.
 * The gaps-* files add the scenarios the E2E scenario map found missing, to
 * existing flows by name or as new ones.
 */
export const E2E_FLOW_CATALOGUE: readonly CatalogueFlow[] = mergeByName([
  ...APP_ACCOUNT_FLOWS,
  ...APP_POD_FLOWS,
  ...APP_SOCIAL_COMMERCE_FLOWS,
  ...APP_STUDIO_FLOWS,
  ...ADMIN_FLOWS,
  ...PARTNER_PORTAL_FLOWS,
  ...STAFF_OPS_PORTAL_FLOWS,
  ...STAFF_OTHER_PORTAL_FLOWS,
  ...WEBSITE_SERVER_FLOWS,
  ...APP_GAP_FLOWS,
  ...STAFF_GAP_FLOWS,
  ...PARTNER_GAP_FLOWS_A,
  ...PARTNER_GAP_FLOWS_B,
  ...OTHER_GAP_FLOWS,
]);
