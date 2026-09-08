import type { RegionTreeNode } from '../queries';

/**
 * Which boxes a search lights up.
 *
 * A match brings its ANCESTORS with it: a Host box floating with no city or
 * club admin above it says nothing useful, and the branch a person sits on is
 * most of what a manager searching for them wants to see. Descendants are
 * deliberately NOT included — searching a city should not light every host in
 * it, or the search would stop narrowing anything.
 *
 * Returns `null` for an empty query, which the canvas reads as "everything
 * matches" rather than building a set of every id on every render.
 */
export function matchingNodeIds(
  nodes: RegionTreeNode[],
  query: string,
): { ids: ReadonlySet<string> | null; hits: number } {
  const term = query.trim().toLowerCase();
  if (!term) return { ids: null, hits: 0 };

  const parentOf = new Map(nodes.map((node) => [node.id, node.parent_id]));
  const lit = new Set<string>();
  let hits = 0;

  for (const node of nodes) {
    const haystack = `${node.label} ${node.sub_label}`.toLowerCase();
    if (!haystack.includes(term)) continue;
    hits += 1;
    let cursor: string | null | undefined = node.id;
    while (cursor && !lit.has(cursor)) {
      lit.add(cursor);
      cursor = parentOf.get(cursor);
    }
  }

  return { ids: lit, hits };
}
