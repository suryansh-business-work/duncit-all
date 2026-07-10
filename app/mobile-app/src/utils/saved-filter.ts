import { SavedPodSort } from '@/generated/graphql/graphql';

/** Sort keys accepted by `mySavedPods` (RECENT = recently-saved, the default). */
export type SavedSort = SavedPodSort;

/** [value, label] pairs for the Saved Items sort sheet (single source of truth). */
export const SAVED_SORTS: readonly (readonly [SavedPodSort, string])[] = [
  [SavedPodSort.Recent, 'Recently saved'],
  [SavedPodSort.DateAsc, 'Pod date · Soonest'],
  [SavedPodSort.DateDesc, 'Pod date · Latest'],
  [SavedPodSort.PriceLow, 'Price · Low to High'],
  [SavedPodSort.PriceHigh, 'Price · High to Low'],
  [SavedPodSort.NameAsc, 'Name · A to Z'],
  [SavedPodSort.NameDesc, 'Name · Z to A'],
];

/** Minimal category shape the cascade needs (satisfied by the pod-history tree). */
export interface SavedCategory {
  id: string;
  name: string;
  level: string;
  parent_id?: string | null;
}

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
  sort: SavedPodSort.Recent,
};

/** Top-level (For You / For Your Pet) options for the Super Category dropdown. */
export const superCategories = (cats: readonly SavedCategory[]): SavedCategory[] =>
  cats.filter((c) => c.level === 'SUPER');

/** Category options under a selected super (empty until a super is chosen). */
export const categoriesUnder = (
  cats: readonly SavedCategory[],
  superId: string,
): SavedCategory[] =>
  superId ? cats.filter((c) => c.level === 'CATEGORY' && c.parent_id === superId) : [];

/** Sub-category options under a selected category (empty until one is chosen). */
export const subsUnder = (cats: readonly SavedCategory[], categoryId: string): SavedCategory[] =>
  categoryId ? cats.filter((c) => c.level === 'SUB' && c.parent_id === categoryId) : [];

/**
 * The deepest selected node — the single id sent to the server, which expands it
 * downward to match that node and all of its sub-categories.
 */
export const effectiveCategoryId = (f: SavedFilters): string | null =>
  f.subId || f.categoryId || f.superId || null;

/** How many category levels are active — drives the filter badge. */
export const activeSavedFilterCount = (f: SavedFilters): number =>
  (f.superId ? 1 : 0) + (f.categoryId ? 1 : 0) + (f.subId ? 1 : 0);
