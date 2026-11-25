import { gql } from '@/generated/graphql';

/**
 * CRM › User Leads › WhatsApp Leads — the portal page's own operations: the
 * counts, the paged list, one lead, add, edit, delete and the clean-up.
 */
export const CrmAppUserLeadStatsDocument = gql(`
  query CrmAppUserLeadStats {
    waLeadStats { total_leads total_communities total_groups total_contacts }
  }
`);

export const CrmAppUserLeadsDocument = gql(`
  query CrmAppUserLeads($input: WaPageInput) {
    waUserLeads(input: $input) {
      total
      items { id phone name source_account imported_at }
    }
  }
`);

export const CrmAppUserLeadDocument = gql(`
  query CrmAppUserLead($id: ID!) {
    waUserLead(id: $id) {
      id phone name contact_jid source_account imported_at
      source_communities { jid name }
      source_groups { jid name }
    }
  }
`);

export const CrmAppCreateUserLeadDocument = gql(`
  mutation CrmAppCreateUserLead($input: WaCreateUserLeadInput!) {
    waCreateUserLead(input: $input) { id }
  }
`);

export const CrmAppUpdateUserLeadDocument = gql(`
  mutation CrmAppUpdateUserLead($id: ID!, $input: WaUpdateUserLeadInput!) {
    waUpdateUserLead(id: $id, input: $input) { id }
  }
`);

export const CrmAppDeleteUserLeadDocument = gql(`
  mutation CrmAppDeleteUserLead($id: ID!) {
    waDeleteUserLead(id: $id)
  }
`);

export const CrmAppCleanUserLeadsDocument = gql(`
  mutation CrmAppCleanUserLeads {
    waCleanData { removed_invalid removed_duplicates removed_contacts remaining }
  }
`);
