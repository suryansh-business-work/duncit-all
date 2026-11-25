import { gql } from '@/generated/graphql';

/**
 * CRM › Data › Services Offered — the portal page's own operations: the
 * server-side list (search, sort, pages), the Super → Category → Sub pickers,
 * and add (several titles at once), edit and delete.
 */
export const CrmAppServicesOfferedTableDocument = gql(`
  query CrmAppServicesOfferedTable($query: TableQueryInput) {
    crmServicesOfferedTable(query: $query) {
      total
      rows {
        id title super_category_name category_name sub_category_name
        applies_to_venue applies_to_host applies_to_ecomm applies_to_creator applies_to_community
        is_active created_at
      }
    }
  }
`);

/** Categories at one level, scoped to their parent — the cascading pickers. */
export const CrmAppCategoriesByParentDocument = gql(`
  query CrmAppCategoriesByParent($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) { id name is_active sort_order }
  }
`);

export const CrmAppCreateServicesOfferedDocument = gql(`
  mutation CrmAppCreateServicesOffered($input: CreateCrmServiceOfferedInput!) {
    createCrmServicesOffered(input: $input) { id }
  }
`);

export const CrmAppUpdateServiceOfferedDocument = gql(`
  mutation CrmAppUpdateServiceOffered($id: ID!, $input: UpdateCrmServiceOfferedInput!) {
    updateCrmServiceOffered(id: $id, input: $input) { id }
  }
`);

export const CrmAppDeleteServiceOfferedDocument = gql(`
  mutation CrmAppDeleteServiceOffered($id: ID!) {
    deleteCrmServiceOffered(id: $id)
  }
`);
