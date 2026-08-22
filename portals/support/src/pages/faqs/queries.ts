import { gql } from '@apollo/client';

/**
 * One server entity backs both FAQ tables — the audience (APP or PARTNERS) is
 * pinned per page in `fetchRows`, so the documents themselves are shared.
 */
const FAQ_ROW_FIELDS = `
  id
  audience
  partner_topic
  super_category_id
  super_category {
    id
    name
  }
  question
  answer
  is_active
  sort_order
  created_at
  updated_at
`;

export const FAQS_TABLE = gql`
  query SupportFaqsTable($query: TableQueryInput) {
    faqsTable(query: $query) {
      total
      rows { ${FAQ_ROW_FIELDS} }
    }
  }
`;

export const SUPER_CATS_FOR_FAQ = gql`
  query SupportSuperCatsForFaq {
    categories(filter: { level: SUPER }) {
      id
      name
    }
  }
`;

export const CREATE_FAQ = gql`
  mutation SupportCreateFaq($input: CreateFaqInput!) {
    createFaq(input: $input) {
      id
    }
  }
`;

export const UPDATE_FAQ = gql`
  mutation SupportUpdateFaq($faq_doc_id: ID!, $input: UpdateFaqInput!) {
    updateFaq(faq_doc_id: $faq_doc_id, input: $input) {
      id
    }
  }
`;

export const DELETE_FAQ = gql`
  mutation SupportDeleteFaq($faq_doc_id: ID!) {
    deleteFaq(faq_doc_id: $faq_doc_id)
  }
`;
