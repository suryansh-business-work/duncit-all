import { urlConfigs } from '../../config/url-configs';
import type { MarketingLeadCrmKind } from './queries';

/** The CRM portal's detail page for each kind of lead (portals/crm App.tsx). */
const CRM_PATH: Record<MarketingLeadCrmKind, string> = {
  VENUE: 'venue-leads',
  HOST: 'host-leads',
  ECOMM: 'ecomm-leads',
};

/** Where a promoted lead lives now: the CRM record, on the CRM portal this build pairs with. */
export const crmLeadUrl = (kind: MarketingLeadCrmKind, id: string): string =>
  `${urlConfigs.crmUrl}/${CRM_PATH[kind]}/${encodeURIComponent(id)}/view`;
