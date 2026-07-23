import { gql } from '@apollo/client';

export const CATEGORIES = gql`
  query Categories($filter: CategoryFilterInput) {
    categories(filter: $filter) {
      id
      name
      slug
      icon
      description
      media {
        url
        type
      }
      level
      parent_id
      is_active
      is_system
      sort_order
      allow_co_hosts
      max_co_hosts
      icon_layout_mweb {
        position
        width
        height
      }
      icon_layout_native {
        position
        width
        height
      }
      updated_at
    }
  }
`;
export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
    }
  }
`;
export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($category_id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(category_id: $category_id, input: $input) {
      id
    }
  }
`;
export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($category_id: ID!) {
    deleteCategory(category_id: $category_id)
  }
`;

export type Level = 'SUPER' | 'CATEGORY' | 'SUB';

/** Where the category icon sits relative to its label in the home vibe tabber. */
export type CategoryIconPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

/** Per-surface icon placement + pixel size. CATEGORY-level categories only. */
export interface CategoryIconLayout {
  position: CategoryIconPosition;
  width: number;
  height: number;
}

export interface CatItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  media: { url: string; type: 'IMAGE' | 'VIDEO' }[];
  level: Level;
  parent_id: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  allow_co_hosts: boolean;
  max_co_hosts: number;
  icon_layout_mweb?: CategoryIconLayout | null;
  icon_layout_native?: CategoryIconLayout | null;
}

export interface FormState {
  id?: string;
  name: string;
  icon: string;
  iconMode: 'ICON' | 'IMAGE';
  description: string;
  mediaText: string;
  sort_order: number;
  is_active: boolean;
  /** SUB-category only. */
  allow_co_hosts: boolean;
  /** SUB-category only, 1-5. */
  max_co_hosts: number;
  /** CATEGORY-level only; null until configured. */
  icon_layout_mweb: CategoryIconLayout | null;
  /** CATEGORY-level only; null until configured. */
  icon_layout_native: CategoryIconLayout | null;
}

export const blankForm: FormState = {
  name: '',
  icon: '',
  iconMode: 'ICON',
  description: '',
  mediaText: '',
  sort_order: 0,
  is_active: true,
  allow_co_hosts: false,
  max_co_hosts: 1,
  icon_layout_mweb: null,
  icon_layout_native: null,
};
