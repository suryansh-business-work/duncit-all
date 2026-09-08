import type { RegionTreeNode } from '../queries';

/**
 * Where each box sits on the canvas.
 *
 * React Flow positions nothing by itself, and the alternative — pulling in
 * dagre or elk — is a layout engine for graphs that can cycle. This is a tree:
 * every node has exactly one parent, so the tidy layout is one pass up from the
 * leaves. Leaves take the next free row; a parent centres over its children.
 *
 * The pass computes a DEPTH and a ROW per node and nothing else. Which of the
 * two is horizontal is the last step, so the same measurements serve both
 * orientations and neither can drift from the other.
 */
export type LayoutDirection = 'LR' | 'TB';

export const NODE_WIDTH = 230;
export const NODE_HEIGHT = 74;
/** Gap between one level and the next, per orientation. */
const DEPTH_GAP = { LR: 90, TB: 70 } as const;
/** Gap between two boxes on the same level, per orientation. */
const ROW_GAP = { LR: 24, TB: 28 } as const;

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

/** parent id -> its children, in the order the nodes arrived. */
function childMap(nodes: RegionTreeNode[], byId: Map<string, RegionTreeNode>) {
  const childrenOf = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id || !byId.has(node.parent_id)) continue;
    const list = childrenOf.get(node.parent_id);
    if (list) list.push(node.id);
    else childrenOf.set(node.parent_id, [node.id]);
  }
  return childrenOf;
}

/**
 * The row each node sits on: leaves take the next free one, a parent centres
 * over its children.
 *
 * Iterative rather than recursive: a region with a few thousand hosts is a few
 * thousand frames deep, and a blown stack takes the whole console down. The
 * `expanded` flag is the post-order trick — a node is measured only after its
 * children have been.
 */
function rowsOf(nodes: RegionTreeNode[], byId: Map<string, RegionTreeNode>, childrenOf: Map<string, string[]>) {
  const row = new Map<string, number>();
  let nextRow = 0;

  const place = (rootId: string) => {
    const stack: Array<{ id: string; expanded: boolean }> = [{ id: rootId, expanded: false }];
    while (stack.length > 0) {
      const frame = stack.pop() as { id: string; expanded: boolean };
      const children = childrenOf.get(frame.id) ?? [];
      if (children.length === 0) {
        row.set(frame.id, nextRow);
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
      const first = row.get(children[0]) ?? 0;
      const last = row.get(children[children.length - 1]) ?? 0;
      row.set(frame.id, (first + last) / 2);
    }
  };

  for (const node of nodes) {
    if (!node.parent_id || !byId.has(node.parent_id)) place(node.id);
  }
  return row;
}

/**
 * Lay a tree out, leaves first.
 *
 * `LR` runs the depth axis left-to-right, which is the default because the
 * deepest level is Host and the labels are names: names are wide and shallow,
 * so the depth axis is the one that should be horizontal. `TB` is the same
 * measurements with the axes swapped — a shape that reads better on a tall
 * screen, or when a region is deep rather than wide.
 */
export function layoutTree(
  nodes: RegionTreeNode[],
  direction: LayoutDirection = 'LR',
): PositionedNode[] {
  if (nodes.length === 0) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const childrenOf = childMap(nodes, byId);
  const depth = depthsOf(nodes, childrenOf);
  const row = rowsOf(nodes, byId, childrenOf);

  const depthStep =
    direction === 'LR' ? NODE_WIDTH + DEPTH_GAP.LR : NODE_HEIGHT + DEPTH_GAP.TB;
  const rowStep = direction === 'LR' ? NODE_HEIGHT + ROW_GAP.LR : NODE_WIDTH + ROW_GAP.TB;

  return nodes.map((node) => {
    const alongDepth = (depth.get(node.id) ?? 0) * depthStep;
    const alongRow = (row.get(node.id) ?? 0) * rowStep;
    const horizontal = direction === 'LR';
    return {
      ...node,
      x: horizontal ? alongDepth : alongRow,
      y: horizontal ? alongRow : alongDepth,
    };
  });
}
