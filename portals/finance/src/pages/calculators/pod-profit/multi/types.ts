import { calculatePodProfit } from '../calculate';
import { DEFAULT_INPUTS, type PodProfitInputs, type PodProfitResults } from '../types';

/** The input keys a saved pod carries — the calculator's inputs, one for one. */
const INPUT_KEYS = Object.keys(DEFAULT_INPUTS) as (keyof PodProfitInputs)[];

/** One pod in a comparison, as it is held while editing. */
export interface MultiPodEntry {
  /** Stable key: React's list key and the row's identity across a save. */
  pod_key: string;
  name: string;
  inputs: PodProfitInputs;
}

/** An entry with its waterfall computed — what the accordions render. */
export interface MultiPodRow extends MultiPodEntry {
  results: PodProfitResults;
}

/** A saved comparison as the server returns it. */
export interface SavedMultiPodCalculator {
  id: string;
  name: string;
  pods: (PodProfitInputs & { pod_key: string; name: string })[];
  updated_at: string;
}

/** The four accordion-header figures added up, plus the collection they came from. */
export interface MultiPodTotals {
  pods: number;
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
}

export const EMPTY_TOTALS: MultiPodTotals = {
  pods: 0,
  collection_total: 0,
  gst_amount: 0,
  venue_receives: 0,
  host_receives: 0,
  duncit_revenue_total: 0,
};

/** Rupee addition rounded back to paise, so a long list cannot drift on floats. */
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100;

/** Read a saved pod's inputs back, falling back to the defaults key by key so a
 * document written before an input existed still opens. */
export const inputsOf = (pod: Partial<PodProfitInputs>): PodProfitInputs =>
  INPUT_KEYS.reduce<PodProfitInputs>(
    (acc, key) => ({ ...acc, [key]: pod[key] ?? DEFAULT_INPUTS[key] }),
    DEFAULT_INPUTS
  );

/** Entries + their results, computed with the same function the single-pod tab uses. */
export const rowsOf = (entries: readonly MultiPodEntry[]): MultiPodRow[] =>
  entries.map((entry) => ({ ...entry, results: calculatePodProfit(entry.inputs) }));

/** "Sabka addition" — every pod's figures summed for the totals card. */
export function sumMultiPods(rows: readonly MultiPodRow[]): MultiPodTotals {
  return rows.reduce<MultiPodTotals>(
    (acc, { results }) => ({
      pods: acc.pods + 1,
      collection_total: add(acc.collection_total, results.collection_total),
      gst_amount: add(acc.gst_amount, results.gst_amount),
      venue_receives: add(acc.venue_receives, results.venue_receives),
      host_receives: add(acc.host_receives, results.host_receives),
      duncit_revenue_total: add(acc.duncit_revenue_total, results.duncit_revenue_total),
    }),
    EMPTY_TOTALS
  );
}

/** Totals for a saved row, so the list table shows the same four figures. */
export const totalsOfSaved = (saved: SavedMultiPodCalculator): MultiPodTotals =>
  sumMultiPods(
    rowsOf(
      saved.pods.map((pod) => ({ pod_key: pod.pod_key, name: pod.name, inputs: inputsOf(pod) }))
    )
  );

/** A saved comparison read back into editable entries. */
export const entriesOfSaved = (saved: SavedMultiPodCalculator): MultiPodEntry[] =>
  saved.pods.map((pod) => ({ pod_key: pod.pod_key, name: pod.name, inputs: inputsOf(pod) }));

/** Editor entries flattened the way the save mutation wants them. */
export const podPayload = (entries: readonly MultiPodEntry[]) =>
  entries.map((entry) => ({ pod_key: entry.pod_key, name: entry.name, ...entry.inputs }));

/**
 * What a comparison currently amounts to, as one comparable string.
 *
 * The SAME function builds this and the mutation payload, so "has anything
 * changed" can never disagree with what a save would actually write.
 */
export const signatureOf = (name: string, entries: readonly MultiPodEntry[]): string =>
  JSON.stringify({ name: name.trim(), pods: podPayload(entries) });
