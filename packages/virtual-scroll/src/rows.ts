/**
 * The feed row model shared by the mWeb and native "all pods" lists (rule 27):
 * pods are chunked into rows of `columns` cards, and a full-width ad row
 * follows the row that completes every `adEvery`-th pod — the classic "one
 * banner after every 4 pods" interleave on a single-column phone list, kept
 * aligned to row boundaries on wider grids.
 */

export interface PodsRow<T> {
  kind: 'pods';
  items: T[];
}

export interface AdRow<A> {
  kind: 'ad';
  ad: A;
  /** Stable render key — unique even when the same ad appears elsewhere. */
  adKey: string;
}

export type FeedRow<T, A> = PodsRow<T> | AdRow<A>;

/** Discriminated-union guard — narrows a feed row to the ad branch. */
export function isAdRow<T, A>(row: FeedRow<T, A>): row is AdRow<A> {
  return row.kind === 'ad';
}

export interface BuildFeedRowsInput<T, A> {
  pods: readonly T[];
  /** Ad pool woven into the list; [] renders pods only. Each ad is used once. */
  ads: readonly A[];
  /** Cards per row (1 on the phone lists). */
  columns: number;
  /** A banner row follows the row containing every `adEvery`-th pod. */
  adEvery: number;
  adKeyOf: (ad: A, index: number) => string;
}

export function buildFeedRows<T, A>(input: Readonly<BuildFeedRowsInput<T, A>>): FeedRow<T, A>[] {
  const { pods, ads, adEvery, adKeyOf } = input;
  const columns = Math.max(1, Math.floor(input.columns));
  const rows: FeedRow<T, A>[] = [];
  let adIndex = 0;
  for (let i = 0; i < pods.length; i += columns) {
    rows.push({ kind: 'pods', items: pods.slice(i, i + columns) });
    const podsSoFar = Math.min(i + columns, pods.length);
    const due = adEvery > 0 ? Math.floor(podsSoFar / adEvery) : 0;
    // At most one banner per pods row — on wide grids where a single row spans
    // several adEvery multiples, the due count catches up on later rows instead
    // of stacking adjacent banners.
    if (adIndex < due && adIndex < ads.length) {
      const ad = ads[adIndex];
      if (ad !== undefined) rows.push({ kind: 'ad', ad, adKey: adKeyOf(ad, adIndex) });
      adIndex += 1;
    }
  }
  return rows;
}

/**
 * Row containing the pod at `podIndex` — the jump target when "See all"
 * continues from where the home rail stopped.
 */
export function rowForPodIndex<T, A>(rows: readonly FeedRow<T, A>[], podIndex: number): number {
  if (podIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row?.kind !== 'pods') continue;
    seen += row.items.length;
    if (seen > podIndex) return i;
  }
  return Math.max(0, rows.length - 1);
}

/** How many fixed-width cards (+ gaps) fit in a container. Minimum 1. */
export function computeColumns(containerWidth: number, itemWidth: number, gap: number): number {
  if (containerWidth <= 0 || itemWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
}
