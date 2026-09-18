import type { Option } from './translate';

/** The fields of a category the tree needs. */
export interface CategoryNodeLike {
  id: string;
  name: string;
  parent_id?: string | null;
  sort_order: number;
}

export interface CategoryDepth<T> {
  node: T;
  depth: number;
}

const bySortOrder = <T extends CategoryNodeLike>(a: T, b: T) =>
  a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/** A sorted copy — the list belongs to Apollo's cache and must not be reordered in place. */
function sortedCopy<T extends CategoryNodeLike>(list: readonly T[]): T[] {
  const copy = [...list];
  copy.sort(bySortOrder);
  return copy;
}

/**
 * Categories as the header menu files them: each parent followed by its
 * children, depth-first, siblings in their sort order. A child whose parent is
 * gone is treated as top level so it can never vanish from the console.
 */
export function flattenCategories<T extends CategoryNodeLike>(categories: readonly T[]): CategoryDepth<T>[] {
  const ids = new Set(categories.map((c) => c.id));
  const childrenOf = new Map<string, T[]>();
  for (const category of categories) {
    const parent = category.parent_id && ids.has(category.parent_id) ? category.parent_id : '';
    const siblings = childrenOf.get(parent) ?? [];
    siblings.push(category);
    childrenOf.set(parent, siblings);
  }
  const out: CategoryDepth<T>[] = [];
  const visit = (parent: string, depth: number) => {
    for (const node of sortedCopy(childrenOf.get(parent) ?? [])) {
      out.push({ node, depth });
      visit(node.id, depth + 1);
    }
  };
  visit('', 0);
  return out;
}

/** The category options of a picker, indented by depth so the hierarchy reads in a flat list. */
export function categoryOptions<T extends CategoryNodeLike>(categories: readonly T[]): Option[] {
  return flattenCategories(categories).map(({ node, depth }) => ({
    value: node.id,
    label: '— '.repeat(depth) + node.name,
  }));
}

/**
 * The parents a category may move under: every category except itself and
 * anything beneath it — a category cannot sit inside its own branch.
 */
export function parentOptions<T extends CategoryNodeLike>(categories: readonly T[], selfId: string | null): Option[] {
  const blocked = new Set<string>(selfId ? [selfId] : []);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parent_id && blocked.has(category.parent_id) && !blocked.has(category.id)) {
        blocked.add(category.id);
        grew = true;
      }
    }
  }
  return categoryOptions(categories).filter((option) => !blocked.has(option.value));
}

/** Ids of the siblings of `node` (itself included), in their current order. */
export function siblingIds<T extends CategoryNodeLike>(categories: readonly T[], node: T): string[] {
  const parent = node.parent_id ?? null;
  return sortedCopy(categories.filter((c) => (c.parent_id ?? null) === parent)).map((c) => c.id);
}
