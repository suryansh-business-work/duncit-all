import { gql } from '@apollo/client';

const SERVICE_OFFERED_FIELDS = `id title super_category_id category_id sub_category_id is_active sort_order`;

/** Categories at a given level, optionally scoped to a parent (for cascading pickers). */
export const CATEGORIES_BY_PARENT = gql`
  query CategoriesByParent($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) {
      id
      name
      slug
      parent_id
      is_active
      sort_order
    }
  }
`;

/**
 * All categories at a level (no parent filter) — needed for sub-categories,
 * which span several selected parent categories. Filtered client-side by the
 * chosen category ids. (Passing parent_id: null would wrongly match only
 * parentless rows.)
 */
export const CATEGORIES_BY_LEVEL = gql`
  query CategoriesByLevel($level: CategoryLevel!) {
    categories(filter: { level: $level }) {
      id
      name
      slug
      parent_id
      is_active
      sort_order
    }
  }
`;

export const CRM_SERVICES_OFFERED = gql`
  query CrmServicesOffered($filter: CrmServiceOfferedFilter) {
    crmServicesOffered(filter: $filter) { ${SERVICE_OFFERED_FIELDS} }
  }
`;

export const CREATE_CRM_SERVICES_OFFERED = gql`
  mutation CreateCrmServicesOffered($input: CreateCrmServiceOfferedInput!) {
    createCrmServicesOffered(input: $input) { ${SERVICE_OFFERED_FIELDS} }
  }
`;

export const UPDATE_CRM_SERVICE_OFFERED = gql`
  mutation UpdateCrmServiceOffered($id: ID!, $input: UpdateCrmServiceOfferedInput!) {
    updateCrmServiceOffered(id: $id, input: $input) { ${SERVICE_OFFERED_FIELDS} }
  }
`;

export const DELETE_CRM_SERVICE_OFFERED = gql`
  mutation DeleteCrmServiceOffered($id: ID!) {
    deleteCrmServiceOffered(id: $id)
  }
`;

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CrmServiceOffered {
  id: string;
  title: string;
  super_category_id: string | null;
  category_id: string | null;
  sub_category_id: string | null;
  is_active: boolean;
  sort_order: number;
}
