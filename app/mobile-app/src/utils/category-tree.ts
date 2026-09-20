import { CategoryLevel } from '@/generated/graphql/graphql';

/** One node of the admin category tree, as the cascade pickers read it. */
export interface CategoryTreeItem {
  id: string;
  name: string;
  level: CategoryLevel;
  parent_id?: string | null;
  sort_order?: number | null;
}

/** A pickable category: the chip value the cascade renders. */
export interface CategoryChoice {
  value: string;
  label: string;
}

/** Admin order first, then name — the order every category list in the app
 * uses (see `useCategoryLevel`), so the same tree never reads two ways. */
const byAdminOrder = (a: CategoryTreeItem, b: CategoryTreeItem) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);

const toChoice = (item: CategoryTreeItem): CategoryChoice => ({
  value: item.id,
  label: item.name,
});

// `filter` already hands back a fresh array, so sorting it mutates nothing the
// caller holds.
const pick = (tree: readonly CategoryTreeItem[], keep: (item: CategoryTreeItem) => boolean) =>
  tree.filter(keep).sort(byAdminOrder).map(toChoice);

/** The top-level SUPER categories. */
export function superChoices(tree: readonly CategoryTreeItem[]): CategoryChoice[] {
  return pick(tree, (item) => item.level === CategoryLevel.Super);
}

/** The middle CATEGORY level under one Super. Empty until a Super is chosen. */
export function categoryChoices(
  tree: readonly CategoryTreeItem[],
  superId: string,
): CategoryChoice[] {
  if (!superId) return [];
  return pick(tree, (item) => item.level === CategoryLevel.Category && item.parent_id === superId);
}

/**
 * The SUB level under a middle Category — or, while no middle is chosen, every
 * Sub sitting under the chosen Super. That "skip the middle" fallback is what
 * `AdminCategorySelect` does by default (its `strict` prop turns it off), and
 * it is why a club can be tagged straight from its Super.
 */
export function subChoices(
  tree: readonly CategoryTreeItem[],
  categoryId: string,
  superId: string,
): CategoryChoice[] {
  if (categoryId) {
    return pick(tree, (item) => item.level === CategoryLevel.Sub && item.parent_id === categoryId);
  }
  if (!superId) return [];
  const middles = new Set(categoryChoices(tree, superId).map((choice) => choice.value));
  return pick(
    tree,
    (item) => item.level === CategoryLevel.Sub && !!item.parent_id && middles.has(item.parent_id),
  );
}

/** The middle Category a Sub belongs to — how a form seeded with only a Super
 * and a Sub recovers the level the record never stored. '' when unknown. */
export function middleCategoryId(tree: readonly CategoryTreeItem[], subId: string): string {
  if (!subId) return '';
  return tree.find((item) => item.id === subId)?.parent_id ?? '';
}
