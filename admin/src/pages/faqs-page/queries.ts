import { gql } from '@apollo/client';

export const FAQS = gql`
  query AdminFaqs($filter: FaqFilterInput) {
    faqs(filter: $filter) {
      id
      super_category_id
      super_category {
        id
        name
      }
      question
      answer
      is_active
      sort_order
      updated_at
    }
  }
`;

export const SUPER_CATS_FOR_FAQ = gql`
  query SuperCatsForFaq {
    categories(filter: { level: SUPER }) {
      id
      name
    }
  }
`;

export const CREATE_FAQ = gql`
  mutation CreateFaq($input: CreateFaqInput!) {
    createFaq(input: $input) {
      id
    }
  }
`;

export const UPDATE_FAQ = gql`
  mutation UpdateFaq($faq_doc_id: ID!, $input: UpdateFaqInput!) {
    updateFaq(faq_doc_id: $faq_doc_id, input: $input) {
      id
    }
  }
`;

export const DELETE_FAQ = gql`
  mutation DeleteFaq($faq_doc_id: ID!) {
    deleteFaq(faq_doc_id: $faq_doc_id)
  }
`;
