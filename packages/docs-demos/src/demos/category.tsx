import {
  EMPTY_CATEGORY,
  buildCategoryValue,
  categoryOptions,
  subOptions,
  superOptions,
  type CategoryDoc,
} from '@duncit/category';
import { defineDemo, defineDemos } from '../types';

interface CategoryMock {
  /** The whole catalogue, exactly as the admin categories query answers. */
  categories: CategoryDoc[];
  super_id: string;
  category_id: string;
  sub_id: string;
}

export default defineDemos('category', [
  defineDemo<CategoryMock>({
    id: 'cascade',
    title: 'Super → Category → Sub, and what a form finally stores',
    note:
      'Clear category_id and the sub list widens to every sub under the chosen super — which is the behaviour that lets a host pick a sub-category without first naming the middle tier.',
    mock: {
      categories: [
        { id: 'sup-1', name: 'Human', slug: 'human', level: 'SUPER', parent_id: null },
        { id: 'sup-2', name: 'Pet', slug: 'pet', level: 'SUPER', parent_id: null },
        { id: 'cat-1', name: 'Sports', slug: 'sports', level: 'CATEGORY', parent_id: 'sup-1' },
        { id: 'cat-2', name: 'Music', slug: 'music', level: 'CATEGORY', parent_id: 'sup-1' },
        { id: 'cat-3', name: 'Dog walks', slug: 'dog-walks', level: 'CATEGORY', parent_id: 'sup-2' },
        { id: 'sub-1', name: 'Badminton', slug: 'badminton', level: 'SUB', parent_id: 'cat-1' },
        { id: 'sub-2', name: 'Football', slug: 'football', level: 'SUB', parent_id: 'cat-1' },
        { id: 'sub-3', name: 'Open mic', slug: 'open-mic', level: 'SUB', parent_id: 'cat-2' },
      ],
      super_id: 'sup-1',
      category_id: 'cat-1',
      sub_id: 'sub-1',
    },
    compute: (mock) => ({
      'Super options': superOptions(mock.categories).map((option) => option.label),
      'Categories under the chosen super': categoryOptions(mock.categories, mock.super_id).map(
        (option) => option.label
      ),
      'Subs offered now': subOptions(mock.categories, mock.category_id, mock.super_id).map(
        (option) => option.label
      ),
      'Subs if no middle is chosen': subOptions(mock.categories, '', mock.super_id).map(
        (option) => option.label
      ),
      'What the form stores': buildCategoryValue(mock.categories, mock.super_id, mock.sub_id),
      'Nothing chosen yet': EMPTY_CATEGORY,
    }),
  }),
]);
