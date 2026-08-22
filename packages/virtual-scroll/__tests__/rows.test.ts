import { describe, expect, it } from 'vitest';

import { buildFeedRows, computeColumns, isAdRow, rowForPodIndex, type FeedRow } from '../src/rows';

const pods = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const ads = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `a${i}` }));
const adKeyOf = (ad: { id: string }, index: number) => `${ad.id}:${index}`;

const shape = <T, A>(rows: FeedRow<T, A>[]) =>
  rows.map((r) => (r.kind === 'ad' ? `ad(${r.adKey})` : `pods(${(r.items as string[]).join(',')})`));

describe('buildFeedRows', () => {
  it('chunks pods into rows of `columns`, with a short final row', () => {
    const rows = buildFeedRows({ pods: pods(5), ads: [], columns: 2, adEvery: 0, adKeyOf });

    expect(shape(rows)).toEqual(['pods(p0,p1)', 'pods(p2,p3)', 'pods(p4)']);
  });

  it('drops a banner after the row that completes every adEvery-th pod', () => {
    const rows = buildFeedRows({ pods: pods(9), ads: ads(3), columns: 1, adEvery: 4, adKeyOf });

    expect(shape(rows)).toEqual([
      'pods(p0)',
      'pods(p1)',
      'pods(p2)',
      'pods(p3)',
      'ad(a0:0)',
      'pods(p4)',
      'pods(p5)',
      'pods(p6)',
      'pods(p7)',
      'ad(a1:1)',
      'pods(p8)',
    ]);
  });

  it('never stacks two banners on a wide grid — the due count catches up on later rows', () => {
    // A 4-wide row crosses two adEvery=2 multiples at once.
    const rows = buildFeedRows({ pods: pods(8), ads: ads(4), columns: 4, adEvery: 2, adKeyOf });

    expect(shape(rows)).toEqual(['pods(p0,p1,p2,p3)', 'ad(a0:0)', 'pods(p4,p5,p6,p7)', 'ad(a1:1)']);
  });

  it('renders pods only when the ad pool is empty', () => {
    const rows = buildFeedRows({ pods: pods(8), ads: [], columns: 1, adEvery: 2, adKeyOf });

    expect(rows.every((r) => r.kind === 'pods')).toBe(true);
  });

  it('stops interleaving once the pool is exhausted — each ad is used once', () => {
    const rows = buildFeedRows({ pods: pods(10), ads: ads(1), columns: 1, adEvery: 2, adKeyOf });

    expect(rows.filter(isAdRow)).toHaveLength(1);
  });

  it('places no banner when adEvery is zero or negative', () => {
    for (const adEvery of [0, -3]) {
      const rows = buildFeedRows({ pods: pods(6), ads: ads(3), columns: 1, adEvery, adKeyOf });
      expect(rows.filter(isAdRow)).toHaveLength(0);
    }
  });

  it('floors and floors-to-one a nonsense column count instead of looping forever', () => {
    expect(shape(buildFeedRows({ pods: pods(3), ads: [], columns: 2.9, adEvery: 0, adKeyOf }))).toEqual([
      'pods(p0,p1)',
      'pods(p2)',
    ]);
    expect(shape(buildFeedRows({ pods: pods(2), ads: [], columns: 0, adEvery: 0, adKeyOf }))).toEqual([
      'pods(p0)',
      'pods(p1)',
    ]);
  });

  it('returns nothing for an empty pod list', () => {
    expect(buildFeedRows({ pods: [], ads: ads(2), columns: 2, adEvery: 1, adKeyOf })).toEqual([]);
  });

  it('skips a hole in the ad pool rather than rendering an undefined banner', () => {
    const holed = [undefined] as unknown as readonly { id: string }[];
    const rows = buildFeedRows({ pods: pods(2), ads: holed, columns: 1, adEvery: 1, adKeyOf });

    expect(rows.filter(isAdRow)).toHaveLength(0);
  });
});

describe('isAdRow', () => {
  it('narrows to the ad branch only', () => {
    expect(isAdRow({ kind: 'ad', ad: 1, adKey: 'k' })).toBe(true);
    expect(isAdRow({ kind: 'pods', items: [] })).toBe(false);
  });
});

describe('rowForPodIndex', () => {
  const rows = buildFeedRows({ pods: pods(9), ads: ads(3), columns: 2, adEvery: 4, adKeyOf });

  it('returns the first row for the start of the list', () => {
    expect(rowForPodIndex(rows, 0)).toBe(0);
    expect(rowForPodIndex(rows, -5)).toBe(0);
  });

  it('finds the pods row holding a given pod, counting past the banners', () => {
    // rows: pods(0,1) pods(2,3) ad pods(4,5) pods(6,7) ad pods(8)
    expect(rowForPodIndex(rows, 3)).toBe(1);
    expect(rowForPodIndex(rows, 4)).toBe(3);
    expect(rowForPodIndex(rows, 8)).toBe(6);
  });

  it('clamps past the end to the last row', () => {
    expect(rowForPodIndex(rows, 999)).toBe(rows.length - 1);
  });

  it('clamps to 0 when there are no rows at all', () => {
    expect(rowForPodIndex([], 4)).toBe(0);
  });
});

describe('computeColumns', () => {
  it('fits as many fixed-width cards plus gaps as the container allows', () => {
    expect(computeColumns(1000, 300, 20)).toBe(3);
    expect(computeColumns(940, 300, 20)).toBe(3);
    expect(computeColumns(939, 300, 20)).toBe(2);
  });

  it('never returns less than one column, whatever the measurements say', () => {
    expect(computeColumns(100, 300, 20)).toBe(1);
    expect(computeColumns(0, 300, 20)).toBe(1);
    expect(computeColumns(-10, 300, 20)).toBe(1);
    expect(computeColumns(1000, 0, 20)).toBe(1);
  });
});
