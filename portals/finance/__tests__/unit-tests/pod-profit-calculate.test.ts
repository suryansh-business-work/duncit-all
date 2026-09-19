import { describe, expect, it } from 'vitest';
import { calculatePodProfit } from '../../src/pages/calculators/pod-profit/calculate';
import { DEFAULT_INPUTS, newExpense, type PodProfitInputs } from '../../src/pages/calculators/pod-profit/types';
import {
  EMPTY_TOTALS,
  entriesOfSaved,
  expensesOf,
  inputsOf,
  newEntry,
  podPayload,
  rowsOf,
  signatureOf,
  sumPods,
  totalsOfSaved,
} from '../../src/pages/calculators/pod-profit/saved/types';
import { makeCalculator, makeExpense, makePod } from '../mocks/pod-calculator.mock';

// The shipped defaults (₹1,000 × 29 payable spots, ₹400 venue, 18/5/10/10/3 %)
// pay the venue ₹360, the host ₹20,022.34 and Duncit ₹4,193.93.
const withExpenses: PodProfitInputs = {
  ...DEFAULT_INPUTS,
  expenses: [
    { expense_key: 'e1', label: 'Refreshments', amount: 600, borne_by: 'DUNCIT' },
    { expense_key: 'e2', label: 'Coach travel', amount: 1000.5, borne_by: 'HOST' },
    { expense_key: 'e3', label: 'Cleaning', amount: 100, borne_by: 'VENUE' },
  ],
};

describe('calculatePodProfit — expenses and the projection', () => {
  it('charges each expense to its own side without moving the waterfall', () => {
    const r = calculatePodProfit(withExpenses);
    expect(r.venue_receives).toBe(360);
    expect(r.host_receives).toBe(20022.34);
    expect(r.duncit_revenue_total).toBe(4193.93);
    // Expenses sit outside the collection identity.
    expect(r.reconciled_total).toBe(29000);

    expect(r.expenses).toEqual({ DUNCIT: 600, HOST: 1000.5, VENUE: 100 });
    expect(r.expense_total).toBe(1700.5);
    expect(r.venue_net).toBe(260);
    expect(r.host_net).toBe(19021.84);
    expect(r.duncit_net).toBe(3593.93);
    expect(r.host_net_percent).toBe(65.59);
  });

  it('multiplies every figure by the pod count, re-rounding nothing', () => {
    const r = calculatePodProfit({ ...withExpenses, pod_count: 3 });
    expect(r.collection_total).toBe(29000); // the per-pod figures stay per pod
    expect(r.scaled).toEqual({
      pod_count: 3,
      collection_total: 87000,
      gst_amount: 13271.19,
      venue_receives: 1080,
      host_receives: 60067.02,
      duncit_revenue_total: 12581.79,
      expenses: { DUNCIT: 1800, HOST: 3001.5, VENUE: 300 },
      expense_total: 5101.5,
      venue_net: 780,
      host_net: 57065.52,
      duncit_net: 10781.79,
    });
  });

  it('starts a new expense row at ₹0, charged to Duncit, under a fresh key', () => {
    const first = newExpense();
    const second = newExpense();
    expect(first).toMatchObject({ label: '', amount: 0, borne_by: 'DUNCIT' });
    expect(first.expense_key).not.toBe(second.expense_key);
  });
});

describe('saved calculation helpers', () => {
  it('rebuilds saved expense lines without the cache typename', () => {
    const lines = expensesOf([makeExpense(), makeExpense({ expense_key: 'exp-bibs', label: 'Bibs', amount: 0, borne_by: 'HOST' })]);
    expect(lines).toEqual([
      { expense_key: 'exp-refreshments', label: 'Refreshments', amount: 600, borne_by: 'DUNCIT' },
      // A line saved before anyone typed an amount comes back as ₹0.
      { expense_key: 'exp-bibs', label: 'Bibs', amount: 0, borne_by: 'HOST' },
    ]);
    expect(lines[0]).not.toHaveProperty('__typename');
  });

  it('reads a saved pod back as calculator inputs only', () => {
    const pod = makePod({ pod_amount: 750, pod_count: 2, expenses: [makeExpense()] });
    const inputs = inputsOf(pod);
    expect(inputs).not.toHaveProperty('pod_key');
    expect(inputs).not.toHaveProperty('name');
    expect(inputs).not.toHaveProperty('__typename');
    expect(inputs.pod_amount).toBe(750);
    expect(inputs.pod_count).toBe(2);
    expect(inputs.expenses[0]).not.toHaveProperty('__typename');
  });

  it('flattens entries into the save payload and signs them for the dirty check', () => {
    const saved = makeCalculator({ name: 'Diwali weekend' });
    const entries = entriesOfSaved(saved);
    expect(entries).toHaveLength(1);
    expect(podPayload(entries)[0]).toMatchObject({ pod_key: 'pod-sunday-football', name: 'Sunday Turf Football', pod_amount: 1000 });

    // Surrounding whitespace in the name is not a change.
    expect(signatureOf('  Diwali weekend ', entries)).toBe(signatureOf('Diwali weekend', entries));
    const edited = [{ ...entries[0], inputs: { ...entries[0].inputs, pod_amount: 1200 } }];
    expect(signatureOf('Diwali weekend', edited)).not.toBe(signatureOf('Diwali weekend', entries));
  });

  it('sums the scaled figures, counting every modelled pod', () => {
    expect(sumPods([])).toEqual(EMPTY_TOTALS);

    const saved = makeCalculator({
      kind: 'MULTI',
      pods: [
        makePod(),
        makePod({ pod_key: 'pod-weekday-yoga', name: 'Weekday Yoga', pod_amount: 500, pod_count: 3, expenses: [makeExpense()] }),
      ],
    });
    const rows = rowsOf(entriesOfSaved(saved));
    const totals = sumPods(rows);
    expect(totals.pods).toBe(4);
    expect(totals.collection_total).toBe(29000 + 3 * 14500);
    expect(totals.expenses.DUNCIT).toBe(1800);
    expect(totals.expense_total).toBe(1800);
    expect(totals.duncit_net).toBeCloseTo(
      rows[0].results.scaled.duncit_net + rows[1].results.scaled.duncit_net,
      2,
    );
    expect(totalsOfSaved(saved)).toEqual(totals);
  });

  it('seeds a new pod from given inputs, re-keying every copied expense line', () => {
    const source: PodProfitInputs = { ...DEFAULT_INPUTS, pod_amount: 1500, expenses: expensesOf([makeExpense()]) };
    const entry = newEntry('Pod', 2, source);
    expect(entry.name).toBe('Pod 2');
    expect(entry.inputs.pod_amount).toBe(1500);
    expect(entry.inputs.expenses).toHaveLength(1);
    expect(entry.inputs.expenses[0].label).toBe('Refreshments');
    // Two rows sharing an expense key would collide on the first edit.
    expect(entry.inputs.expenses[0].expense_key).not.toBe('exp-refreshments');
    expect(newEntry('Pod', 2, source).pod_key).not.toBe(entry.pod_key);
  });
});
