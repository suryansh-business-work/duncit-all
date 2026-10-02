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
