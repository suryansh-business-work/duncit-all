import {
  EMPTY_CATEGORY,
  buildCategoryValue,
  categoryOptions,
  categoryRowsMessage,
  duplicateCategoryRows,
  isCompleteCategory,
  subOptions,
  superOptions,
  type AdminCategoryValue,
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

/** What a form holding `RhfAdminCategoryRows` has in its field, and the cap it was given. */
interface CategoryRowsMock {
  /** The field's value: one whole picker value per row, primary first. */
  rows: AdminCategoryValue[];
  /** The `max` prop — for a venue, `venueRegistrationConfig.category_limit`. */
  max: number;
}

export default defineDemos('category', [
  defineDemo<CategoryMock>({
    id: 'cascade',
    title: 'Super → Category → Sub, and what a form finally stores',
    note:
      'Clear category_id and the sub list widens to every sub under the chosen super — which is the behaviour that lets a host pick a sub-category without first naming the middle tier. The picker\'s `strict` prop turns that off (Sub waits for a Category), which is what the Admin > Pods filter row uses.',
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

  defineDemo<CategoryRowsMock>({
    id: 'rows',
    title: 'Several categories in one field — what RhfAdminCategoryRows decides per row',
    note:
      'Row 3 repeats row 1\'s sub category, so it is the one flagged (the first to name a sub category keeps it); row 4 is still being picked, so it is not a category yet. Lower max to 4 and the add button shuts. The rows field itself needs a form and the admin tree, so this shows the pure rules it and a Zod schema share.',
    mock: {
      rows: [
        { super_id: 'sup-1', super_name: 'Human', category_id: 'cat-1', category_name: 'Sports', sub_id: 'sub-1', sub_name: 'Badminton' },
        { super_id: 'sup-1', super_name: 'Human', category_id: 'cat-2', category_name: 'Music', sub_id: 'sub-3', sub_name: 'Open mic' },
        { super_id: 'sup-1', super_name: 'Human', category_id: 'cat-1', category_name: 'Sports', sub_id: 'sub-1', sub_name: 'Badminton' },
        { super_id: 'sup-2', super_name: 'Pet', category_id: '', category_name: '', sub_id: '', sub_name: '' },
      ],
      max: 10,
    },
    compute: (mock) => {
      const duplicates = duplicateCategoryRows(mock.rows);
      return {
        'Primary (row 1)': mock.rows[0]?.sub_name || '(not chosen yet)',
        'isCompleteCategory(row), per row': mock.rows.map(isCompleteCategory),
        'duplicateCategoryRows(rows) — row indexes flagged with labels.duplicate': [...duplicates],
        'Add button': mock.rows.length >= mock.max ? 'disabled — the list is at max' : 'enabled',
        'What a venue form sends: whole rows only, primary first': mock.rows
          .filter(isCompleteCategory)
          .map((row) => ({ super_category_id: row.super_id, category_id: row.category_id, sub_category_id: row.sub_id })),
        'categoryRowsMessage(a list-level form error)': categoryRowsMessage({
          root: { message: `A venue can have at most ${mock.max} categories.` },
        }),
      };
    },
  }),
]);
