import type { CrmLeadDiscoveryInput } from '@duncit/gql-types';
import {
  DISCOVERY_LIMITS,
  DISCOVERY_SOURCES,
  leadDiscoveryDefaults as sharedDefaults,
  makeLeadDiscoverySchema,
  toLeadDiscoveryInput,
  type LeadDiscoveryValues,
} from '@duncit/forms/schemas';
import type { Translate } from './lead-discovery.types';

/*
  Discover leads. The rules live in @duncit/forms/schemas (lead-discovery),
  shared with the Duncit CRM app; these are the portal's names.
*/
export { DISCOVERY_LIMITS, DISCOVERY_SOURCES };

export const leadDiscoverySchema = (t: Translate) => makeLeadDiscoverySchema(t);

export type LeadDiscoveryFormValues = LeadDiscoveryValues;

export const leadDiscoveryDefaults: LeadDiscoveryFormValues = sharedDefaults;

/** The startCrmLeadDiscovery input: blank optional text as null, no ticked source = the server's defaults. */
export function toDiscoveryInput(values: LeadDiscoveryFormValues): CrmLeadDiscoveryInput {
  return toLeadDiscoveryInput(values);
}
