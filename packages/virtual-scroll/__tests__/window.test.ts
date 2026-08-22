import { describe, expect, it } from 'vitest';

import { buildOffsets, computeRange, findRowAt, makeItemLayout } from '../src/window';

describe('buildOffsets', () => {
  it('returns prefix sums with the total content height in the last slot', () => {
    expect(buildOffsets([10, 20, 30])).toEqual([0, 10, 30, 60]);
  });

  it('gives every row its trailing gap, so pads plus rows always sum to the total', () => {
    expect(buildOffsets([10, 20, 30], 5)).toEqual([0, 15, 40, 75]);
  });

  it('starts the first row at the lead offset', () => {
    expect(buildOffsets([10, 20], 5, 100)).toEqual([100, 115, 140]);
  });

  it('treats a missing height as zero rather than producing NaN offsets', () => {
    const holed = [10, undefined, 30] as unknown as readonly number[];

    expect(buildOffsets(holed)).toEqual([0, 10, 10, 40]);
  });

  it('answers with just the lead offset when there are no rows', () => {
    expect(buildOffsets([])).toEqual([0]);
    expect(buildOffsets([], 5, 42)).toEqual([42]);
  });
});

describe('findRowAt', () => {
  const offsets = buildOffsets([100, 100, 100, 100]); // [0,100,200,300,400]

  it('finds the row containing a position', () => {
    expect(findRowAt(offsets, 0)).toBe(0);
    expect(findRowAt(offsets, 99)).toBe(0);
    expect(findRowAt(offsets, 100)).toBe(1);
    expect(findRowAt(offsets, 250)).toBe(2);
  });

  it('clamps above the list to the first row and below it to the last', () => {
    expect(findRowAt(offsets, -500)).toBe(0);
    expect(findRowAt(offsets, 10_000)).toBe(3);
  });

  it('answers 0 for an empty list instead of a negative index', () => {
    expect(findRowAt([0], 50)).toBe(0);
    expect(findRowAt([], 50)).toBe(0);
  });

  it('treats a hole in the offsets as position zero', () => {
    const holed = [0, undefined, 200, 300] as unknown as readonly number[];

    expect(findRowAt(holed, 150)).toBe(1);
  });
});

describe('computeRange', () => {
  const offsets = buildOffsets([100, 100, 100, 100, 100, 100]); // total 600

  it('mounts the viewport rows plus the overscan on each side', () => {
    expect(computeRange({ offsets, viewTop: 200, viewBottom: 400, overscanLead: 0, overscanTrail: 0 })).toEqual({
      start: 2,
      end: 4,
      leadPad: 200,
      trailPad: 100,
    });
  });

  it('keeps more rows below the fold than above, so upcoming rows exist before they are reached', () => {
    const range = computeRange({
      offsets,
      viewTop: 200,
      viewBottom: 300,
      overscanLead: 100,
      overscanTrail: 250,
    });

    expect(range.start).toBe(1);
    expect(range.end).toBe(5);
    expect(range.trailPad).toBe(0);
  });

  it('makes the pads and mounted rows sum to the total content height', () => {
    const range = computeRange({ offsets, viewTop: 150, viewBottom: 350, overscanLead: 0, overscanTrail: 0 });
    const mounted = (offsets[range.end + 1] ?? 0) - (offsets[range.start] ?? 0);

    expect(range.leadPad + mounted + range.trailPad).toBe(600);
  });

  it('clamps a viewport scrolled above the list back to the first row', () => {
    const range = computeRange({ offsets, viewTop: -500, viewBottom: -100, overscanLead: 0, overscanTrail: 0 });

    expect(range.start).toBe(0);
    expect(range.leadPad).toBe(0);
  });

  it('reports an empty range for an empty list', () => {
    expect(computeRange({ offsets: [0], viewTop: 0, viewBottom: 100, overscanLead: 0, overscanTrail: 0 })).toEqual({
      start: 0,
      end: -1,
      leadPad: 0,
      trailPad: 0,
    });
  });

  it('treats a hole at the total slot as zero rather than NaN pads', () => {
    const holed = [0, 100, undefined] as unknown as readonly number[];
    const range = computeRange({ offsets: holed, viewTop: 0, viewBottom: 50, overscanLead: 0, overscanTrail: 0 });

    expect(range.trailPad).toBe(0);
  });
});

describe('makeItemLayout', () => {
  it('answers FlatList with the height and offset of any row, so a jump lands exactly', () => {
    const heights = [50, 80, 120];
    const layout = makeItemLayout(heights, buildOffsets(heights));

    expect(layout(null, 1)).toEqual({ length: 80, offset: 50, index: 1 });
  });

  it('answers zeroes for a row past the end instead of undefined', () => {
    const layout = makeItemLayout([50], buildOffsets([50]));

    expect(layout(null, 9)).toEqual({ length: 0, offset: 0, index: 9 });
  });
});
