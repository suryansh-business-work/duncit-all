import type { RegionTreeNode } from './queries';

/**
 * Where each box sits on the canvas.
 *
 * React Flow positions nothing by itself, and the alternative — pulling in
 * dagre or elk — is a layout engine for graphs that can cycle. This is a tree:
 * every node has exactly one parent, so the tidy layout is one pass up from the
 * leaves. Leaves take the next free row; a parent centres over its children.
 *
 * Left-to-right rather than top-down because the deepest level is Host and the
 * labels are names: names are wide and shallow, so the depth axis is the one
 * that should be horizontal.
 */
export const NODE_WIDTH = 230;
export const NODE_HEIGHT = 74;
/** Gap between one level and the next. */
const COLUMN_GAP = 90;
/** Gap between two boxes in the same column. */
const ROW_GAP = 24;

export interface PositionedNode extends RegionTreeNode {
  x: number;
  y: number;
}

/**
 * Depth per node, walked from the roots down.
 *
 * Reading a node's own parent chain would re-walk the same ancestors for every
 * leaf; one pass over the children map is linear.
 */
function depthsOf(nodes: RegionTreeNode[], childrenOf: Map<string, string[]>) {
  const depth = new Map<string, number>();
  const roots = nodes.filter((node) => !node.parent_id).map((node) => node.id);
  const queue: Array<[string, number]> = roots.map((id) => [id, 0]);
  while (queue.length > 0) {
    const [id, level] = queue.shift() as [string, number];
    depth.set(id, level);
    for (const child of childrenOf.get(id) ?? []) queue.push([child, level + 1]);
  }
  return depth;
}

/** Lay a tree out left-to-right, leaves first. */
export function layoutTree(nodes: RegionTreeNode[]): PositionedNode[] {
  if (nodes.length === 0) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const childrenOf = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id || !byId.has(node.parent_id)) continue;
    childrenOf.set(node.parent_id, [...(childrenOf.get(node.parent_id) ?? []), node.id]);
  }

  const depth = depthsOf(nodes, childrenOf);
  const y = new Map<string, number>();
  let nextRow = 0;

  /**
   * Iterative rather than recursive: a region with a few thousand hosts is a
   * few thousand frames deep, and a blown stack takes the whole console down.
   * The `visited` flag is the post-order trick — a node is measured only after
   * its children have been.
   */
  const place = (rootId: string) => {
    const stack: Array<{ id: string; expanded: boolean }> = [{ id: rootId, expanded: false }];
    while (stack.length > 0) {
      const frame = stack.pop() as { id: string; expanded: boolean };
      const children = childrenOf.get(frame.id) ?? [];
      if (children.length === 0) {
        y.set(frame.id, nextRow * (NODE_HEIGHT + ROW_GAP));
        nextRow += 1;
        continue;
      }
      if (!frame.expanded) {
        stack.push({ id: frame.id, expanded: true });
        // Reversed, because a stack pops the last one first and the rows must
        // come out in the order the children are listed.
        for (const child of [...children].reverse()) stack.push({ id: child, expanded: false });
        continue;
      }
      const first = y.get(children[0]) ?? 0;
      const last = y.get(children[children.length - 1]) ?? 0;
      y.set(frame.id, (first + last) / 2);
    }
  };

  for (const node of nodes) {
    if (!node.parent_id || !byId.has(node.parent_id)) place(node.id);
  }

  return nodes.map((node) => ({
    ...node,
    x: (depth.get(node.id) ?? 0) * (NODE_WIDTH + COLUMN_GAP),
    y: y.get(node.id) ?? 0,
  }));
}
