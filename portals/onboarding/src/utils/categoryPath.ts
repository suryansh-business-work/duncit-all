interface CategoryNames {
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
}

/** "Super › Category › Sub" — the one join every host/venue category list
 * renders. Returns '' when no level is named; call sites keep their own
 * `|| '—'` so an empty cell stays each table's decision. */
export const categoryPath = (c: CategoryNames): string =>
  [c.super_category_name, c.category_name, c.sub_category_name].filter(Boolean).join(' › ');
