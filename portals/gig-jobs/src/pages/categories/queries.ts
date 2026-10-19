import { gql } from '@apollo/client';

const FIELDS = 'id slug_id title description examples sort_order is_active updated_at';

export const GIG_CATEGORIES_TABLE = gql`
  query GigCategoriesTable($query: TableQueryInput) {
    gigCategoriesTable(query: $query) { total page page_size rows { ${FIELDS} } }
  }
`;

export const CREATE_GIG_CATEGORY = gql`
  mutation CreateGigCategory($input: GigCategoryInput!) {
    createGigCategory(input: $input) { ${FIELDS} }
  }
`;

export const UPDATE_GIG_CATEGORY = gql`
  mutation UpdateGigCategory($id: ID!, $input: GigCategoryInput!) {
    updateGigCategory(id: $id, input: $input) { ${FIELDS} }
  }
`;

export const DELETE_GIG_CATEGORY = gql`
  mutation DeleteGigCategory($id: ID!) {
    deleteGigCategory(id: $id)
  }
`;
