import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { CATEGORY_TREE_NODES, type CategoryNode as Node } from '../graphql/engine';

export interface CategoryPathOption {
  id: string;
  label: string;
  level: string;
}

/** "Sports › Cricket › Box cricket" for every category, so a flat list still reads as a tree. */
export function categoryPathOptions(nodes: Node[]): CategoryPathOption[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // The tree is at most three levels deep; the cap also guards a corrupt cycle.
  const path = (n: Node): string[] => {
    const names = [n.name];
    let parent = n.parent_id ? byId.get(n.parent_id) : undefined;
    while (parent && names.length < 3) {
      names.unshift(parent.name);
      parent = parent.parent_id ? byId.get(parent.parent_id) : undefined;
    }
    return names;
  };
  return nodes
    .map((n) => ({ id: n.id, label: path(n).join(' › '), level: n.level }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function useCategoryPaths() {
  const { data, loading, error } = useQuery(CATEGORY_TREE_NODES);
  const options = useMemo(() => categoryPathOptions(data?.categories ?? []), [data]);
  const labelOf = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);
  return { options, labelOf, loading, error };
}
