import type { CategoryDoc } from './types';

export interface Option {
  label: string;
  value: string;
}

const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label);
const toOption = (doc: CategoryDoc): Option => ({ value: doc.id, label: doc.name });

/** Top-level SUPER categories. */
export function superOptions(categories: CategoryDoc[]): Option[] {
  return categories.filter((c) => c.level === 'SUPER').map(toOption).sort(byLabel);
}

/** CATEGORY (middle) options under a super (all middles if no super chosen). */
export function categoryOptions(categories: CategoryDoc[], superId: string): Option[] {
  return categories
    .filter((c) => c.level === 'CATEGORY' && (!superId || c.parent_id === superId))
    .map(toOption)
    .sort(byLabel);
}

/**
 * SUB options under a middle category. When no middle is chosen but a super is,
 * fall back to every sub whose middle sits under that super.
 */
export function subOptions(categories: CategoryDoc[], categoryId: string, superId: string): Option[] {
  const middleIdsForSuper = new Set(
    categories.filter((c) => c.level === 'CATEGORY' && c.parent_id === superId).map((c) => c.id),
  );
  return categories
    .filter((c) => {
      if (c.level !== 'SUB') return false;
      if (categoryId) return c.parent_id === categoryId;
      if (superId) return c.parent_id ? middleIdsForSuper.has(c.parent_id) : false;
      return true;
    })
    .map(toOption)
    .sort(byLabel);
}
