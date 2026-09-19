import { describe, expect, it } from 'vitest';
import { NODE_HEIGHT, NODE_WIDTH, layoutTree } from '../../../../src/pages/region-structure/layout';
import type { RegionTreeNode } from '../../../../src/pages/queries';
import { ADMIN_NODE_ID, MEERA_NODE_ID, ROHAN_NODE_ID, TREE_NODES } from '../../../mocks/region';

/** One level to the next, and one row to the next, per orientation. */
const LR = { depth: NODE_WIDTH + 90, row: NODE_HEIGHT + 24 };
const TB = { depth: NODE_HEIGHT + 70, row: NODE_WIDTH + 28 };

const positions = (nodes: RegionTreeNode[], direction?: 'LR' | 'TB') =>
  Object.fromEntries(layoutTree(nodes, direction).map((node) => [node.id, { x: node.x, y: node.y }]));

const box = (id: string, kind: RegionTreeNode['kind'], parentId: string | null): RegionTreeNode => ({
  id,
  kind,
  parent_id: parentId,
  label: id,
  sub_label: '',
  count: 0,
  ref_id: '',
});

describe('layoutTree', () => {
  it('draws nothing for an empty tree', () => {
    expect(layoutTree([])).toEqual([]);
  });

  it('runs the levels left to right by default, centring each parent on its children', () => {
    const at = positions(TREE_NODES);
    // The two hosts take rows 0 and 1; every level above them sits between.
    expect(at[ROHAN_NODE_ID]).toEqual({ x: 4 * LR.depth, y: 0 });
    expect(at[MEERA_NODE_ID]).toEqual({ x: 4 * LR.depth, y: LR.row });
    expect(at[ADMIN_NODE_ID]).toEqual({ x: 3 * LR.depth, y: 0.5 * LR.row });
    expect(at.region).toEqual({ x: 0, y: 0.5 * LR.row });
  });

  it('swaps the axes for a top-to-bottom tree from the same measurements', () => {
    const at = positions(TREE_NODES, 'TB');
    expect(at[ROHAN_NODE_ID]).toEqual({ x: 0, y: 4 * TB.depth });
    expect(at[MEERA_NODE_ID]).toEqual({ x: TB.row, y: 4 * TB.depth });
    expect(at.region).toEqual({ x: 0.5 * TB.row, y: 0 });
  });

  it('keeps every node’s own fields beside its position', () => {
    const [root] = layoutTree(TREE_NODES);
    expect(root).toMatchObject({ id: 'region', kind: 'REGION', label: 'Bengaluru South' });
  });

  it('centres a parent between its first and last child, and gives a leaf the next free row', () => {
    const nodes = [
      box('region', 'REGION', null),
      box('city:a', 'CITY', 'region'),
      box('city:a/loc:1', 'LOCALITY', 'city:a'),
      box('city:a/loc:2', 'LOCALITY', 'city:a'),
      box('city:a/loc:3', 'LOCALITY', 'city:a'),
      box('city:b', 'CITY', 'region'),
    ];
    const at = positions(nodes);
    expect(at['city:a/loc:1'].y).toBe(0);
    expect(at['city:a/loc:3'].y).toBe(2 * LR.row);
    expect(at['city:a'].y).toBe(LR.row);
    // A city with no localities yet is a leaf: it takes the row after city:a's last.
    expect(at['city:b']).toEqual({ x: LR.depth, y: 3 * LR.row });
    expect(at.region.y).toBe(2 * LR.row);
  });

  it('draws a region with no Club Admins as its lone root box', () => {
    expect(positions([box('region', 'REGION', null)])).toEqual({ region: { x: 0, y: 0 } });
  });
});
