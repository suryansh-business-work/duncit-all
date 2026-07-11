import { gql } from '@/generated/graphql';

/** FAQ groups (grouped by super-category) for the FAQs page + support hub topics. */
export const FaqsDocument = gql(`
  query MobileFaqs {
    publicFaqGroups {
      super_category {
        id
        name
        icon
        slug
      }
      faqs {
        id
        question
        answer
      }
    }
  }
`);

/** Server-side FAQ search for the support help-center search bar (mirrors mWeb's
 * SEARCH_FAQS: active APP FAQs matching the query). */
export const FaqsSearchDocument = gql(`
  query MobileFaqsSearch($search: String!) {
    faqs(filter: { search: $search, audience: APP, is_active: true }) {
      id
      question
      answer
    }
  }
`);
