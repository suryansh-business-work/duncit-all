import { gql } from '@/generated/graphql';

/**
 * CRM › Data › Venues › Amenities and Event Suitability — the portal page's
 * own operations: the list (inactive entries included), add, edit, delete.
 */
export const CrmAppManagedOptionsDocument = gql(`
  query CrmAppManagedOptions($group: CrmManagedOptionGroup!, $include_inactive: Boolean) {
    crmManagedOptions(group: $group, include_inactive: $include_inactive) {
      id name group sort_order is_active
    }
  }
`);

export const CrmAppCreateManagedOptionDocument = gql(`
  mutation CrmAppCreateManagedOption($input: CreateCrmManagedOptionInput!) {
    createCrmManagedOption(input: $input) { id }
  }
`);

export const CrmAppUpdateManagedOptionDocument = gql(`
  mutation CrmAppUpdateManagedOption($id: ID!, $input: UpdateCrmManagedOptionInput!) {
    updateCrmManagedOption(id: $id, input: $input) { id }
  }
`);

export const CrmAppDeleteManagedOptionDocument = gql(`
  mutation CrmAppDeleteManagedOption($id: ID!) {
    deleteCrmManagedOption(id: $id)
  }
`);
