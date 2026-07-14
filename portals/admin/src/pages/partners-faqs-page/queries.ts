import { gql } from '@apollo/client';

const PARTNER_FAQ_FIELDS = `
  id
  audience
  partner_topic
  question
  answer
  is_active
  sort_order
  updated_at
`;

export const PARTNER_FAQS = gql`
  query PartnerFaqs($filter: FaqFilterInput) {
    faqs(filter: $filter) { ${PARTNER_FAQ_FIELDS} }
  }
`;

/** Server-side table page over faqs — audience is pinned to PARTNERS in fetchRows. */
export const PARTNER_FAQS_TABLE = gql`
  query PartnerFaqsTable($query: TableQueryInput) {
    faqsTable(query: $query) {
      total
      rows { ${PARTNER_FAQ_FIELDS} created_at }
    }
  }
`;

export const CREATE_PARTNER_FAQ = gql`
  mutation CreatePartnerFaq($input: CreateFaqInput!) {
    createFaq(input: $input) { id }
  }
`;

export const UPDATE_PARTNER_FAQ = gql`
  mutation UpdatePartnerFaq($faq_doc_id: ID!, $input: UpdateFaqInput!) {
    updateFaq(faq_doc_id: $faq_doc_id, input: $input) { id }
  }
`;

export const DELETE_PARTNER_FAQ = gql`
  mutation DeletePartnerFaq($faq_doc_id: ID!) {
    deleteFaq(faq_doc_id: $faq_doc_id)
  }
`;