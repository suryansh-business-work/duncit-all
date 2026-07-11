import { gql } from '@apollo/client';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSuperCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface FaqGroup {
  super_category: FaqSuperCategory | null;
  faqs: FaqItem[];
}

/** All active APP FAQs grouped by super-category (drives Topics + Frequently Asked). */
export const PUBLIC_FAQ_GROUPS = gql`
  query PublicFaqGroups {
    publicFaqGroups {
      super_category {
        id
        name
        slug
        icon
      }
      faqs {
        id
        question
        answer
      }
    }
  }
`;

/** Server-side FAQ search (used by the help-center search bar). */
export const SEARCH_FAQS = gql`
  query SearchFaqs($search: String!) {
    faqs(filter: { search: $search, audience: APP, is_active: true }) {
      id
      question
      answer
    }
  }
`;
