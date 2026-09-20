import { gql } from '@/generated/graphql';

/**
 * The whole admin-managed category tree — Super › Category › Sub — in one read.
 *
 * The cascades that only step DOWN the tree fetch one level at a time
 * (`useCategoryLevel`), but a form seeded from a saved record has to walk UP it:
 * a club persists only its Super and its Sub, and the middle Category that
 * narrows the Sub list is the Sub's `parent_id`. Fetching a level at a time
 * cannot answer that, so the seeded pickers read the tree the way mWeb's
 * `AdminCategorySelect` already does (rule 27).
 */
export const CategoryTreeDocument = gql(`
  query MobileCategoryTree {
    categories {
      id
      name
      level
      parent_id
      is_active
      sort_order
    }
  }
`);
