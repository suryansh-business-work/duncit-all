import { gql } from '@/generated/graphql';

/** Top-level super categories for the header filter tabs (mWeb's SuperCategoryTabs). */
export const SuperCategoriesDocument = gql(`
  query MobileSuperCategories {
    categories(filter: { level: SUPER }) {
      id
      name
      slug
      icon
    }
  }
`);
