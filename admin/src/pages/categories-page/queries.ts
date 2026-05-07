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
}

export const blankForm: FormState = {
  name: '',
  icon: '',
  iconMode: 'ICON',
  description: '',
  mediaText: '',
  sort_order: 0,
  is_active: true,
};
