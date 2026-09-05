import { calculatePodProfit } from '../calculate';
import { DEFAULT_INPUTS, type PodProfitInputs, type PodProfitResults } from '../types';

/** Which tab a saved calculation belongs to. */
export type PodCalculatorKind = 'SINGLE' | 'MULTI';

/** The input keys a saved pod carries — the calculator's inputs, one for one. */
const INPUT_KEYS = Object.keys(DEFAULT_INPUTS) as (keyof PodProfitInputs)[];

/** One pod in a calculation, as it is held while editing. */
export interface PodEntry {
  /** Stable key: React's list key and the row's identity across a save. */
  pod_key: string;
  name: string;
  inputs: PodProfitInputs;
}

/** An entry with its waterfall computed — what the editors render. */
export interface PodRow extends PodEntry {
  results: PodProfitResults;
}

/** A saved calculation as the server returns it. */
export interface SavedPodCalculator {
  id: string;
  name: string;
  kind: PodCalculatorKind;
  pods: (PodProfitInputs & { pod_key: string; name: string })[];
  updated_at: string;
}

/** The four headline figures added up, plus the collection they came from. */
export interface PodTotals {
  /** Pods MODELLED, so a row standing for ten counts as ten. */
  pods: number;
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
}

export const EMPTY_TOTALS: PodTotals = {
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

/** Entries + their results, computed with the one calculator both tabs share. */
export const rowsOf = (entries: readonly PodEntry[]): PodRow[] =>
  entries.map((entry) => ({ ...entry, results: calculatePodProfit(entry.inputs) }));

/**
 * Every pod summed for the totals card.
 *
 * It adds the SCALED figures, not the per-pod ones: a row that stands for ten
 * pods contributes ten pods' worth, which is the whole point of the count.
 */
export function sumPods(rows: readonly PodRow[]): PodTotals {
  return rows.reduce<PodTotals>(
    (acc, { results: { scaled } }) => ({
      pods: acc.pods + scaled.pod_count,
      collection_total: add(acc.collection_total, scaled.collection_total),
      gst_amount: add(acc.gst_amount, scaled.gst_amount),
      venue_receives: add(acc.venue_receives, scaled.venue_receives),
      host_receives: add(acc.host_receives, scaled.host_receives),
      duncit_revenue_total: add(acc.duncit_revenue_total, scaled.duncit_revenue_total),
    }),
    EMPTY_TOTALS
  );
}

/** A saved calculation read back into editable entries. */
export const entriesOfSaved = (saved: SavedPodCalculator): PodEntry[] =>
  saved.pods.map((pod) => ({ pod_key: pod.pod_key, name: pod.name, inputs: inputsOf(pod) }));

/** Editor entries flattened the way the save mutation wants them. */
export const podPayload = (entries: readonly PodEntry[]) =>
  entries.map((entry) => ({ pod_key: entry.pod_key, name: entry.name, ...entry.inputs }));

/**
 * What a calculation currently amounts to, as one comparable string.
 *
 * The SAME function builds this and the mutation payload, so "has anything
 * changed" can never disagree with what a save would actually write.
 */
export const signatureOf = (name: string, entries: readonly PodEntry[]): string =>
  JSON.stringify({ name: name.trim(), pods: podPayload(entries) });

/** Totals for a saved row, so a list table shows the same figures its editor does. */
export const totalsOfSaved = (saved: SavedPodCalculator): PodTotals =>
  sumPods(rowsOf(entriesOfSaved(saved)));

/** A fresh pod row. Callers pass the reader's word for "Pod" and the sequence. */
export const newEntry = (podLabel: string, index: number, inputs = DEFAULT_INPUTS): PodEntry => ({
  pod_key: globalThis.crypto.randomUUID(),
  name: `${podLabel} ${index}`,
  inputs,
});
