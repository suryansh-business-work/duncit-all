import type { SavedCategory } from './queries';

export type SavedSort =
  | 'RECENT'
  | 'DATE_ASC'
  | 'DATE_DESC'
  | 'PRICE_LOW'
  | 'PRICE_HIGH'
  | 'NAME_ASC'
  | 'NAME_DESC';

export interface SavedSortOption {
  value: SavedSort;
  label: string;
}

export const SAVED_SORTS: readonly SavedSortOption[] = [
  { value: 'RECENT', label: 'Recently saved' },
  { value: 'DATE_ASC', label: 'Pod date · Soonest' },
  { value: 'DATE_DESC', label: 'Pod date · Latest' },
  { value: 'PRICE_LOW', label: 'Price · Low to High' },
  { value: 'PRICE_HIGH', label: 'Price · High to Low' },
  { value: 'NAME_ASC', label: 'Name · A to Z' },
  { value: 'NAME_DESC', label: 'Name · Z to A' },
];

export interface SavedFilters {
  superId: string;
  categoryId: string;
  subId: string;
  sort: SavedSort;
}

export const DEFAULT_SAVED_FILTERS: SavedFilters = {
  superId: '',
  categoryId: '',
  subId: '',
  sort: 'RECENT',
};

export const superCategories = (cats: readonly SavedCategory[]): SavedCategory[] =>
  cats.filter((c) => c.level === 'SUPER');

export const categoriesUnder = (cats: readonly SavedCategory[], superId: string): SavedCategory[] =>
  superId ? cats.filter((c) => c.level === 'CATEGORY' && c.parent_id === superId) : [];

export const subsUnder = (cats: readonly SavedCategory[], categoryId: string): SavedCategory[] =>
  categoryId ? cats.filter((c) => c.level === 'SUB' && c.parent_id === categoryId) : [];

/** The deepest selected node — this single id is sent to the server, which
 * expands it to match the category and all of its sub-categories. */
export const effectiveCategoryId = (f: SavedFilters): string | null =>
  f.subId || f.categoryId || f.superId || null;

export const activeSavedFilterCount = (f: SavedFilters): number =>
  (f.superId ? 1 : 0) + (f.categoryId ? 1 : 0) + (f.subId ? 1 : 0);
