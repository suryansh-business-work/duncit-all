import type { TeamNode } from './types';

export const SEAT_WIDTH = 240;
export const SEAT_HEIGHT = 104;
const X_GAP = 28;
const Y_GAP = 72;

export interface PlacedSeat {
  id: string;
  x: number;
  y: number;
}

/**
 * Top-down tidy tree: leaves take the next free column and a parent centres
 * over its children. Seats are never dragged, so the picture is always a pure
 * function of the tree and two people looking at it see the same chart.
 * Iterative, so a deep chain cannot overflow the stack.
 */
export function layoutSeats(nodes: readonly TeamNode[]): PlacedSeat[] {
  const ids = new Set(nodes.map((n) => n.id));
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const node of nodes) {
    if (node.parent_id && ids.has(node.parent_id)) {
      children.set(node.parent_id, [...(children.get(node.parent_id) ?? []), node.id]);
    } else {
      roots.push(node.id);
    }
  }

  const column = new Map<string, number>();
  const depth = new Map<string, number>();
  let next = 0;
  for (const root of roots) {
    const stack: Array<{ id: string; level: number; done: boolean }> = [{ id: root, level: 0, done: false }];
    while (stack.length > 0) {
      const frame = stack.pop() as { id: string; level: number; done: boolean };
      const kids = children.get(frame.id) ?? [];
      depth.set(frame.id, frame.level);
      if (kids.length === 0) {
        column.set(frame.id, next);
        next += 1;
      } else if (frame.done) {
        column.set(frame.id, ((column.get(kids[0]) as number) + (column.get(kids.at(-1) as string) as number)) / 2);
      } else {
        stack.push({ ...frame, done: true });
        for (const kid of [...kids].reverse()) stack.push({ id: kid, level: frame.level + 1, done: false });
      }
    }
  }

  return nodes.map((n) => ({
    id: n.id,
    x: (column.get(n.id) ?? 0) * (SEAT_WIDTH + X_GAP),
    y: (depth.get(n.id) ?? 0) * (SEAT_HEIGHT + Y_GAP),
  }));
}
