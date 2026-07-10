import { gql } from '@/generated/graphql';

/** FAQ groups (grouped by super-category) for the FAQs page. */
export const FaqsDocument = gql(`
  query MobileFaqs {
    publicFaqGroups {
      super_category {
        id
        name
      }
      faqs {
        id
        question
        answer
      }
    }
  }
`);
