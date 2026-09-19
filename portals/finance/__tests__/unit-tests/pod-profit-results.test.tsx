import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ResultsCard from '../../src/pages/calculators/pod-profit/ResultsCard';
import TotalsCard from '../../src/pages/calculators/pod-profit/saved/TotalsCard';
import { calculatePodProfit } from '../../src/pages/calculators/pod-profit/calculate';
import { DEFAULT_INPUTS, formatRupees, type PodExpense, type PodProfitInputs } from '../../src/pages/calculators/pod-profit/types';
import { rowsOf, sumPods } from '../../src/pages/calculators/pod-profit/saved/types';
import { renderWithProviders } from '../testkit';

// The shipped defaults pay the venue ₹360, the host ₹20,022.34 and Duncit
// ₹4,193.93 per pod; the expense sets below sit either side of those.
const expenses = (venue: number, host: number, duncit: number): PodExpense[] => [
  { expense_key: 'venue-cleaning', label: 'Cleaning', amount: venue, borne_by: 'VENUE' },
  { expense_key: 'host-travel', label: 'Coach travel', amount: host, borne_by: 'HOST' },
  { expense_key: 'duncit-kit', label: 'Bibs and cones', amount: duncit, borne_by: 'DUNCIT' },
];

/** Every side spends more than it was paid. */
const overspent: PodProfitInputs = { ...DEFAULT_INPUTS, expenses: expenses(500, 25000, 5000) };
/** Every side keeps money after its costs. */
const withinBudget: PodProfitInputs = { ...DEFAULT_INPUTS, expenses: expenses(100, 1000, 600) };

const intro =
  'Costs for ONE pod. Each expense comes off the side that carries it, so the payouts above are untouched and the net below is what that side keeps.';

describe('ResultsCard', () => {
  it('shows the costs per pod and again across every pod, including negative nets', () => {
    renderWithProviders(<ResultsCard results={calculatePodProfit({ ...overspent, pod_count: 2 })} />);

    expect(screen.getByText('Across all pods')).toBeInTheDocument();
    expect(screen.getByText('Every figure below is the single pod above, multiplied by this count.')).toBeInTheDocument();
    // Per pod, then projected: the intro explains the first block only.
    expect(screen.getAllByText('Costs & net')).toHaveLength(2);
    expect(screen.getAllByText(intro)).toHaveLength(1);

    // Per-pod nets…
    expect(screen.getByText(formatRupees(-140))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(-4977.66))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(-806.07))).toBeInTheDocument();
    // …and the same across both pods.
    expect(screen.getByText(formatRupees(-280))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(-9955.32))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(-1612.14))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(61000))).toBeInTheDocument();
  });

  it('keeps positive nets on one pod with no projection', () => {
    renderWithProviders(<ResultsCard results={calculatePodProfit(withinBudget)} />);

    expect(screen.queryByText('Across all pods')).toBeNull();
    expect(screen.getAllByText('Costs & net')).toHaveLength(1);
    expect(screen.getByText(intro)).toBeInTheDocument();
    expect(screen.getByText(formatRupees(260))).toBeInTheDocument(); // venue 360 − 100
    expect(screen.getByText(formatRupees(19022.34))).toBeInTheDocument(); // host − 1,000
    expect(screen.getByText(formatRupees(3593.93))).toBeInTheDocument(); // Duncit − 600
    expect(screen.getByText('Venue expenses: ₹100')).toBeInTheDocument();
  });

  it('names a venue shortfall on the host and hides costs when there are none', () => {
    // The venue's ₹30,000 slot price is more than the ₹22,647 left after the
    // club-admin cut, so the host's remainder goes negative.
    const results = calculatePodProfit({ ...DEFAULT_INPUTS, venue_amount: 30000 });
    expect(results.host_receives).toBeLessThan(0);
    renderWithProviders(<ResultsCard results={results} />);

    expect(screen.getByText(/shortfall lands on the host/)).toHaveTextContent(
      `Host amount less commission: ${formatRupees(results.host_amount)}`,
    );
    expect(screen.getByText(formatRupees(results.host_receives))).toBeInTheDocument();
    expect(screen.queryByText('Costs & net')).toBeNull();
    // The take-home share reads negative too (−₹7,352.96 of ₹29,000).
    expect(screen.getByText('-25.4% host take-home')).toBeInTheDocument();
  });
});

describe('TotalsCard', () => {
  const totalsFor = (inputs: PodProfitInputs[]) =>
    sumPods(rowsOf(inputs.map((entry, index) => ({ pod_key: `pod-${index + 1}`, name: `Pod ${index + 1}`, inputs: entry }))));

  it('adds every pod up and shows what each side keeps after overspending', () => {
    const totals = totalsFor([overspent, { ...overspent, pod_count: 2 }]);
    renderWithProviders(<TotalsCard totals={totals} />);

    expect(screen.getByText('Grand total')).toBeInTheDocument();
    expect(screen.getByText('Pods in this comparison: 3')).toBeInTheDocument();
    expect(screen.getByText(formatRupees(87000))).toBeInTheDocument();
    expect(screen.getByText('Total expenses')).toBeInTheDocument();
    expect(screen.getByText(formatRupees(totals.venue_net))).toBeInTheDocument();
    expect(totals.venue_net).toBe(-420);
    expect(totals.host_net).toBeLessThan(0);
    expect(totals.duncit_net).toBeLessThan(0);
  });

  it('shows positive nets when every side stays within budget', () => {
    const totals = totalsFor([withinBudget]);
    renderWithProviders(<TotalsCard totals={totals} />);

    expect(screen.getByText(formatRupees(260))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(19022.34))).toBeInTheDocument();
    expect(screen.getByText(formatRupees(3593.93))).toBeInTheDocument();
  });

  it('leaves the cost row out until something has been spent', () => {
    renderWithProviders(<TotalsCard totals={totalsFor([DEFAULT_INPUTS])} />);

    expect(screen.getByText('Pods in this comparison: 1')).toBeInTheDocument();
    expect(screen.queryByText('Total expenses')).toBeNull();
  });
});
