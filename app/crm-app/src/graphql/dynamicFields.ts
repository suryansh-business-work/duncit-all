import { gql } from '@/generated/graphql';

/**
 * CRM › Settings › Dynamic Fields — the portal's documents: every field
 * (inactive ones too), create, update, delete and the saved order.
 */
export const CrmAppDynamicFieldFields = gql(`
  fragment CrmAppDynamicField on CrmDynamicField {
    id name label kind options { value label } multi placeholder default_value hint
    applies_to_venue applies_to_host applies_to_ecomm applies_to_creator applies_to_community
    required sort_order is_active
  }
`);

export const CrmAppDynamicFieldsDocument = gql(`
  query CrmAppDynamicFields($include_inactive: Boolean) {
    crmDynamicFields(include_inactive: $include_inactive) { ...CrmAppDynamicField }
  }
`);

export const CrmAppCreateDynamicFieldDocument = gql(`
  mutation CrmAppCreateDynamicField($input: CrmDynamicFieldInput!) {
    createCrmDynamicField(input: $input) { id }
  }
`);

export const CrmAppUpdateDynamicFieldDocument = gql(`
  mutation CrmAppUpdateDynamicField($id: ID!, $input: CrmDynamicFieldInput!) {
    updateCrmDynamicField(id: $id, input: $input) { id }
  }
`);

export const CrmAppDeleteDynamicFieldDocument = gql(`
  mutation CrmAppDeleteDynamicField($id: ID!) {
    deleteCrmDynamicField(id: $id)
  }
`);

export const CrmAppReorderDynamicFieldsDocument = gql(`
  mutation CrmAppReorderDynamicFields($ids: [ID!]!) {
    reorderCrmDynamicFields(ids: $ids) { id }
  }
`);
