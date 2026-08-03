/**
 * Pure windowing math for virtualized lists — no DOM, no React, no React
 * Native. A surface feeds it row heights and a scroll position; it answers
 * which rows should be mounted (with an asymmetric overscan so rows BELOW the
 * fold exist before the user reaches them — the "load ahead" of infinite
 * scroll) and how tall the spacers standing in for everything unmounted are.
 */

export interface VirtualRange {
  /** First row index to mount. */
  start: number;
  /** Last row index to mount (inclusive; -1 when there are no rows). */
  end: number;
  /** Spacer height replacing the rows above `start`. */
  leadPad: number;
  /** Spacer height replacing the rows below `end`. */
  trailPad: number;
}

/**
 * Prefix sums of row tops: `offsets[i]` is the top of row i and
 * `offsets[heights.length]` is the total content height (lead offset + rows,
 * every row carrying its trailing gap — matching renderers that give each
 * mounted row a `gap` bottom margin, so pads + rows always sum to the total).
 */
export function buildOffsets(heights: readonly number[], gap = 0, leadOffset = 0): number[] {
  const offsets: number[] = new Array(heights.length + 1);
  let y = leadOffset;
  for (let i = 0; i < heights.length; i += 1) {
    offsets[i] = y;
    y += (heights[i] ?? 0) + gap;
  }
  offsets[heights.length] = y;
  return offsets;
}

/** Index of the row containing vertical position `y`, clamped to the ends. */
export function findRowAt(offsets: readonly number[], y: number): number {
  const count = offsets.length - 1;
  if (count <= 0) return 0;
  let lo = 0;
  let hi = count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((offsets[mid] ?? 0) <= y) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

export interface RangeInput {
  /** Output of `buildOffsets` for the current row heights. */
  offsets: readonly number[];
  /** Top of the viewport in list coordinates (negative above the list). */
  viewTop: number;
  /** Bottom of the viewport in list coordinates. */
  viewBottom: number;
  /** Extra pixels kept mounted above the viewport. */
  overscanLead: number;
  /**
   * Extra pixels kept mounted below the viewport. Keep this larger than
   * `overscanLead` so upcoming rows are rendered before the user scrolls to
   * them.
   */
  overscanTrail: number;
}

/** The rows to mount for a viewport, plus the spacer heights around them. */
export function computeRange(input: Readonly<RangeInput>): VirtualRange {
  const { offsets, viewTop, viewBottom, overscanLead, overscanTrail } = input;
  const count = offsets.length - 1;
  if (count <= 0) return { start: 0, end: -1, leadPad: 0, trailPad: 0 };
  const total = offsets[count] ?? 0;
  const start = findRowAt(offsets, viewTop - overscanLead);
  const end = findRowAt(offsets, viewBottom + overscanTrail);
  return {
    start,
    end,
    leadPad: (offsets[start] ?? 0) - (offsets[0] ?? 0),
    // Mounted rows each carry their trailing gap, so the block they form ends
    // at the next row's top — whatever is left of the total is the spacer.
    trailPad: Math.max(0, total - (offsets[end + 1] ?? total)),
  };
}

export interface ItemLayout {
  length: number;
  offset: number;
  index: number;
}

/**
 * React Native `FlatList#getItemLayout` from precomputed heights/offsets —
 * what makes `initialScrollIndex` jumps exact without rendering the rows in
 * between.
 */
export function makeItemLayout(heights: readonly number[], offsets: readonly number[]) {
  return (_data: unknown, index: number): ItemLayout => ({
    length: heights[index] ?? 0,
    offset: offsets[index] ?? 0,
    index,
  });
}
