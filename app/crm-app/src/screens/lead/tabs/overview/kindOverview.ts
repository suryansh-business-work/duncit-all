import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmHostTemplateValues, crmVenueTemplateValues } from '@duncit/utils';

import type { LeadKind } from '@/features/leads/leadKinds';
import type { CrmAppLeadOverviewDocument } from '@/graphql/leadTabs';
import type { CardLead, KindOverview } from './overviewTypes';

type Overview = ResultOf<typeof CrmAppLeadOverviewDocument>;

/** This kind's answer from the overview read, tagged with its kind; null when the lead was not found. */
export function kindOverview(kind: LeadKind, data: Overview): KindOverview | null {
  switch (kind) {
    case 'VENUE_LEAD':
      return data.venue ? { kind, data: data.venue } : null;
    case 'HOST_LEAD':
      return data.host ? { kind, data: data.host } : null;
    case 'ECOMM_LEAD':
      return data.ecomm ? { kind, data: data.ecomm } : null;
    case 'CREATOR_LEAD':
      return data.creator ? { kind, data: data.creator } : null;
    default:
      return data.community ? { kind, data: data.community } : null;
  }
}

/** The values a venue or host lead fills into its email templates (other kinds have none). */
export function templateValues(
  overview: KindOverview,
  lead: CardLead,
  name: string,
): Record<string, string> | undefined {
  const shared = {
    ...lead,
    super_category: overview.data.super_category,
    area: overview.data.area,
    website: overview.data.website,
  };
  if (overview.kind === 'VENUE_LEAD') {
    const { space_type, full_address } = overview.data;
    return crmVenueTemplateValues({ ...shared, venue_name: name, space_type, full_address });
  }
  if (overview.kind === 'HOST_LEAD') {
    const { host_type, organization_name } = overview.data;
    return crmHostTemplateValues({ ...shared, host_name: name, host_type, organization_name });
  }
  return undefined;
}
