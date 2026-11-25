import {
  CrmAppCreateCommunityLeadDocument,
  CrmAppCreateCreatorLeadDocument,
  CrmAppCreateEcommLeadDocument,
  CrmAppCreateHostLeadDocument,
  CrmAppCreateVenueLeadDocument,
  CrmAppUpdateCommunityLeadDocument,
  CrmAppUpdateCreatorLeadDocument,
  CrmAppUpdateEcommLeadDocument,
  CrmAppUpdateHostLeadDocument,
  CrmAppUpdateVenueLeadDocument,
} from '@/graphql/leadEditor';
import type { LeadKind } from '@/features/leads/leadKinds';
import { gqlRequest } from '@/services/graphql.client';
import { formToInput, type LeadFormValues } from './values';

/**
 * Create or update a lead with the portal's own mutations; resolves to the
 * lead's id. The server runs the same validation, duplicate block and
 * permission checks as for the portal.
 */
export async function saveLead(
  kind: LeadKind,
  id: string | null,
  values: LeadFormValues,
): Promise<string> {
  // formToInput builds each kind's input from KIND_EDITORS, so its shape is per kind at run time;
  // the server validates it against VenueLeadInput / HostLeadInput / … like any portal save.
  const input = formToInput(kind, values) as never;
  switch (kind) {
    case 'VENUE_LEAD':
      return id
        ? (await gqlRequest(CrmAppUpdateVenueLeadDocument, { id, input })).updateVenueLead.id
        : (await gqlRequest(CrmAppCreateVenueLeadDocument, { input })).createVenueLead.id;
    case 'HOST_LEAD':
      return id
        ? (await gqlRequest(CrmAppUpdateHostLeadDocument, { id, input })).updateHostLead.id
        : (await gqlRequest(CrmAppCreateHostLeadDocument, { input })).createHostLead.id;
    case 'ECOMM_LEAD':
      return id
        ? (await gqlRequest(CrmAppUpdateEcommLeadDocument, { id, input })).updateEcommLead.id
        : (await gqlRequest(CrmAppCreateEcommLeadDocument, { input })).createEcommLead.id;
    case 'CREATOR_LEAD':
      return id
        ? (await gqlRequest(CrmAppUpdateCreatorLeadDocument, { id, input })).updateCreatorLead.id
        : (await gqlRequest(CrmAppCreateCreatorLeadDocument, { input })).createCreatorLead.id;
    case 'COMMUNITY_LEAD':
      return id
        ? (await gqlRequest(CrmAppUpdateCommunityLeadDocument, { id, input })).updateCommunityLead
            .id
        : (await gqlRequest(CrmAppCreateCommunityLeadDocument, { input })).createCommunityLead.id;
  }
}
