import { calculatePodProfit } from '../calculate';
import {
  DEFAULT_INPUTS,
  EMPTY_EXPENSE_TOTALS,
  EXPENSE_BEARERS,
  type ExpenseBearer,
  type ExpenseTotals,
  type PodExpense,
  type PodProfitInputs,
  type PodProfitResults,
} from '../types';

const BEARER_SET = new Set<string>(EXPENSE_BEARERS);

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
  /** Every pod's expense lines, by the side that carries them. */
  expenses: ExpenseTotals;
  expense_total: number;
  /** What each side keeps across the whole comparison, after its own costs. */
  venue_net: number;
  host_net: number;
  duncit_net: number;
}

export const EMPTY_TOTALS: PodTotals = {
  pods: 0,
  collection_total: 0,
  gst_amount: 0,
  venue_receives: 0,
  host_receives: 0,
  duncit_revenue_total: 0,
  expenses: EMPTY_EXPENSE_TOTALS,
  expense_total: 0,
  venue_net: 0,
  host_net: 0,
  duncit_net: 0,
};

/** Rupee addition rounded back to paise, so a long list cannot drift on floats. */
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100;

/**
 * A saved pod's expense lines, rebuilt field by field.
 *
 * Never the array Apollo handed back: its objects carry `__typename`, and
 * spreading one into the save mutation is rejected by an input type that has no
 * such field — a save that worked until the first expense was added. Rebuilding
 * also drops the frozen cache objects, so the editor's `map` updates are free
 * to return plain ones.
 */
export const expensesOf = (expenses: readonly Partial<PodExpense>[] | null | undefined): PodExpense[] =>
  (expenses ?? []).map((expense, index) => ({
    expense_key: String(expense.expense_key ?? '') || `expense-${index + 1}`,
    label: String(expense.label ?? ''),
    amount: Number(expense.amount) || 0,
    borne_by: BEARER_SET.has(String(expense.borne_by))
      ? (expense.borne_by as ExpenseBearer)
      : 'DUNCIT',
  }));

/**
 * Read a saved pod's inputs back, falling back to the defaults key by key so a
 * document written before an input existed still opens.
 *
 * `expenses` is then rebuilt over the top: it is the one input that is an array
 * of objects, and the key-by-key fallback would carry the cache's rows through
 * verbatim — `__typename` and all — into the next save.
 */
export function inputsOf(pod: Partial<PodProfitInputs>): PodProfitInputs {
  const scalars = INPUT_KEYS.reduce<PodProfitInputs>(
    (acc, key) => ({ ...acc, [key]: pod[key] ?? DEFAULT_INPUTS[key] }),
    DEFAULT_INPUTS
  );
  return { ...scalars, expenses: expensesOf(pod.expenses) };
}

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
      expenses: {
        DUNCIT: add(acc.expenses.DUNCIT, scaled.expenses.DUNCIT),
        HOST: add(acc.expenses.HOST, scaled.expenses.HOST),
        VENUE: add(acc.expenses.VENUE, scaled.expenses.VENUE),
      },
      expense_total: add(acc.expense_total, scaled.expense_total),
      venue_net: add(acc.venue_net, scaled.venue_net),
      host_net: add(acc.host_net, scaled.host_net),
      duncit_net: add(acc.duncit_net, scaled.duncit_net),
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

/**
 * A fresh pod row. Callers pass the reader's word for "Pod" and the sequence.
 *
 * The multi tab seeds a new pod from the previous one, so `inputs` usually
 * arrives with that pod's cost lines already on it. They are re-keyed rather
 * than shared: two rows carrying the same `expense_key` are two rows whose
 * identities collide the moment one of them is edited or removed.
 */
export const newEntry = (podLabel: string, index: number, inputs = DEFAULT_INPUTS): PodEntry => ({
  pod_key: globalThis.crypto.randomUUID(),
  name: `${podLabel} ${index}`,
  inputs: {
    ...inputs,
    expenses: inputs.expenses.map((expense) => ({
      ...expense,
      expense_key: globalThis.crypto.randomUUID(),
    })),
  },
});
