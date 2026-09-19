import { describe, expect, it } from 'vitest';
import { matchingNodeIds } from '../../../../src/pages/region-structure/search';
import { ADMIN_NODE_ID, MEERA_NODE_ID, ROHAN_NODE_ID, TREE_NODES } from '../../../mocks/region';

const lit = (query: string) => {
  const { ids, hits } = matchingNodeIds(TREE_NODES, query);
  return { ids: ids ? [...ids].sort((a, b) => a.localeCompare(b)) : null, hits };
};

/** Every box from the root down to (and including) the admin. */
const BRANCH_TO_ADMIN = TREE_NODES.slice(0, 4).map((node) => node.id);

describe('matchingNodeIds', () => {
  it('treats a blank search as "everything matches"', () => {
    expect(matchingNodeIds(TREE_NODES, '   ')).toEqual({ ids: null, hits: 0 });
  });

  it('lights a match together with every ancestor above it, case-insensitively', () => {
    expect(lit('ROHAN')).toEqual({
      ids: [...BRANCH_TO_ADMIN, ROHAN_NODE_ID].sort((a, b) => a.localeCompare(b)),
      hits: 1,
    });
  });

  it('matches on the sub-label too, and never lights a match’s descendants', () => {
    // "HSR Book Circle" is only in the Club Admin's sub-label (the clubs they run).
    const { ids, hits } = lit('hsr book');
    expect(hits).toBe(1);
    expect(ids).toContain(ADMIN_NODE_ID);
    expect(ids).not.toContain(ROHAN_NODE_ID);
    expect(ids).not.toContain(MEERA_NODE_ID);
  });

  it('counts every hit once, sharing the branch they sit on', () => {
    // Both hosts' emails end in duncit.com; their common ancestors are lit once.
    const { ids, hits } = lit('@duncit.com');
    expect(hits).toBe(2);
    expect(ids).toHaveLength(TREE_NODES.length);
  });

  it('lights nothing when nothing matches', () => {
    expect(lit('Mysuru')).toEqual({ ids: [], hits: 0 });
  });
});
