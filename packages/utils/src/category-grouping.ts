/**
 * Search's landing grid reads as interests inside their super category: one
 * section per SUPER, its CATEGORY tiles beneath. mWeb and the native app render
 * their own headers and tiles (rule 40: share the logic, never the UI); which
 * category lands under which super is decided here, once.
 */

/** The category fields grouping reads — `level` is SUPER | CATEGORY | SUB. */
export interface GroupableCategory {
  id: string;
  level: string;
  parent_id?: string | null;
}

export interface SuperCategoryGroup<T> {
  superCategory: T;
  categories: T[];
}

/**
 * One group per SUPER that has at least one CATEGORY directly under it, in the
 * order the supers arrive; each group keeps its categories in arrival order.
 * SUB rows and categories whose parent is not a known SUPER are left out.
 */
export function groupCategoriesBySuper<T extends GroupableCategory>(
  all: readonly T[],
): SuperCategoryGroup<T>[] {
  const bySuper = new Map<string, SuperCategoryGroup<T>>(
    all
      .filter((item) => item.level === 'SUPER')
      .map((superCategory) => [superCategory.id, { superCategory, categories: [] }]),
  );
  all
    .filter((item) => item.level === 'CATEGORY')
    .forEach((category) => bySuper.get(category.parent_id ?? '')?.categories.push(category));
  return [...bySuper.values()].filter((group) => group.categories.length > 0);
}

/** The category fields `activeCategories` reads. A missing `is_active` counts as
 * active, so an older payload that never selected it still shows everything. */
export interface ActivatableCategory {
  id: string;
  parent_id?: string | null;
  is_active?: boolean | null;
}

/**
 * The categories a member may see: each one must be active AND every ancestor
 * above it must be too, so switching a CATEGORY off in Admin also hides its
 * SUB rows. Order is kept. A parent missing from `all` does not hide its child —
 * only an explicit `is_active: false` hides anything.
 */
export function activeCategories<T extends ActivatableCategory>(all: readonly T[]): T[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  const isVisible = (item: T): boolean => {
    let current: T | undefined = item;
    for (let depth = 0; current && depth < 16; depth++) {
      if (current.is_active === false) return false;
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return true;
  };
  return all.filter(isVisible);
}
