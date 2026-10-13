import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { logs } from '@duncit/logs';
import ExpensesPage from '../../src/pages/expenses/ExpensesPage';
import { renderWithProviders } from '../testkit';
import {
  deleteExpenseMock,
  expenseSummaryMock,
  makeExpenseClaim,
  makeExpenseSummary,
  myExpensesTableMock,
} from '../mocks';

/**
 * An employee's own claims: what they are owed, the list, and the two things
 * they can still do about a claim Finance has not answered — edit it or
 * withdraw it.
 */
const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/expenses'],
    routes: (
      <>
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<div>NEW CLAIM PAGE</div>} />
        <Route path="/expenses/:id/edit" element={<div>EDIT CLAIM PAGE</div>} />
      </>
    ),
  });

const PENDING = makeExpenseClaim();
const APPROVED = makeExpenseClaim({
  id: 'exp-2',
  claim_id: 'EXP-000102',
  status: 'APPROVED',
  amount: 3000,
  merchant: '',
  description: '',
  category: 'FOOD_AND_MEALS',
  bill_url: '',
  bill_number: '',
});

const filtersOf = (seen: Array<Record<string, unknown>>) =>
  (seen.at(-1)?.query as { filters: Array<{ field: string; op: string; value: unknown }> }).filters;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExpensesPage — the totals', () => {
  it('shows what has been claimed, what awaits review and what was decided', async () => {
    renderPage([expenseSummaryMock(), myExpensesTableMock([])]);

    expect(await screen.findByText('My Expenses')).toBeInTheDocument();
    expect(await screen.findByText('Total claimed')).toBeInTheDocument();
    expect(await screen.findByText(/5000\.00/)).toBeInTheDocument();
    expect(screen.getByText('4 claim(s) filed')).toBeInTheDocument();
    expect(screen.getByText(/1200\.00/)).toBeInTheDocument();
    expect(screen.getByText('1 awaiting a decision')).toBeInTheDocument();
    expect(screen.getByText(/3000\.00/)).toBeInTheDocument();
    expect(screen.getByText('2 approved')).toBeInTheDocument();
    expect(screen.getByText(/800\.00/)).toBeInTheDocument();
    expect(screen.getByText('1 rejected')).toBeInTheDocument();
  });

  it('shows zeroes, not blanks, for an employee who has filed nothing', async () => {
    renderPage([
      expenseSummaryMock(
        makeExpenseSummary({
          claimed_total: 0,
          pending_total: 0,
          approved_total: 0,
          rejected_total: 0,
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          claim_count: 0,
        }),
      ),
      myExpensesTableMock([]),
    ]);

    expect(await screen.findByText('0 claim(s) filed')).toBeInTheDocument();
    expect(screen.getByText('0 awaiting a decision')).toBeInTheDocument();
    expect(screen.getAllByText(/0\.00/).length).toBeGreaterThanOrEqual(4);
  });
});

describe('ExpensesPage — the list', () => {
  it('says so when nothing has been filed', async () => {
    renderPage([expenseSummaryMock(), myExpensesTableMock([])]);
    expect(await screen.findByText('You have not filed an expense claim yet.')).toBeInTheDocument();
  });

  it('shows each claim with what it was for, its bill and its status', async () => {
    renderPage([expenseSummaryMock(), myExpensesTableMock([PENDING, APPROVED])]);

    expect(await screen.findByText('EXP-000101')).toBeInTheDocument();
    expect(screen.getByText('Cab to the venue visit')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('Awaiting review', { selector: '.MuiChip-label' })).toBeInTheDocument();
    const bill = screen.getByRole('link', { name: /INV-77/ });
    expect(bill).toHaveAttribute('href', PENDING.bill_url);
    expect(bill).toHaveAttribute('target', '_blank');

    // A claim with no description is named by its category, no merchant is a
    // dash, and a claim with no bill says so.
    expect(screen.getByText('EXP-000102')).toBeInTheDocument();
    expect(screen.getAllByText('Food And Meals').length).toBeGreaterThan(0);
    expect(screen.getByText('Not attached')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('labels a bill that has no number as "View bill"', async () => {
    renderPage([
      expenseSummaryMock(),
      myExpensesTableMock([makeExpenseClaim({ bill_number: '' })]),
    ]);
    expect(await screen.findByRole('link', { name: 'View bill' })).toHaveAttribute(
      'href',
      PENDING.bill_url,
    );
  });

  it('asks the server for the claims of the chosen tab', async () => {
    const seen: Array<Record<string, unknown>> = [];
    renderPage([expenseSummaryMock(), myExpensesTableMock([PENDING], seen)]);
    await screen.findByText('EXP-000101');
    expect(filtersOf(seen)).toEqual([]);

    fireEvent.click(screen.getByRole('tab', { name: 'Awaiting review' }));
    await waitFor(() =>
      expect(filtersOf(seen)).toContainEqual({ field: 'status', op: 'eq', value: 'PENDING', values: null }),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Rejected' }));
    await waitFor(() =>
      expect(filtersOf(seen)).toContainEqual({ field: 'status', op: 'eq', value: 'REJECTED', values: null }),
    );
  });
});

describe('ExpensesPage — editing and filing', () => {
  it('opens the form for a new claim', async () => {
    renderPage([expenseSummaryMock(), myExpensesTableMock([])]);
    fireEvent.click(await screen.findByRole('button', { name: 'New claim' }));
    expect(await screen.findByText('NEW CLAIM PAGE')).toBeInTheDocument();
  });

  it('opens a claim that is still awaiting review for editing', async () => {
    renderPage([expenseSummaryMock(), myExpensesTableMock([PENDING])]);
    await screen.findByText('EXP-000101');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await screen.findByText('EDIT CLAIM PAGE')).toBeInTheDocument();
  });

  it('keeps Edit and Withdraw visible but disabled once Finance has decided, saying why', async () => {
    renderPage([expenseSummaryMock(), myExpensesTableMock([APPROVED])]);
    await screen.findByText('EXP-000102');

    const locked = screen.getAllByRole('button', {
      name: 'A claim can only be changed while it is still awaiting review.',
    });
    expect(locked).toHaveLength(2);
    for (const button of locked) expect(button).toBeDisabled();
  });
});

describe('ExpensesPage — withdrawing a claim', () => {
  const askToWithdraw = async () => {
    await screen.findByText('EXP-000101');
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw claim' }));
    return screen.findByRole('dialog');
  };

  it('names the claim and the amount before removing it, then removes it and re-reads', async () => {
    const seen: Array<Record<string, unknown>> = [];
    renderPage([
      expenseSummaryMock(),
      myExpensesTableMock([PENDING], seen),
      deleteExpenseMock('exp-1'),
    ]);
    const dialog = await askToWithdraw();
    expect(within(dialog).getByText('Withdraw this claim?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Claim EXP-000101 for ₹1200\.00 will be removed\./),
    ).toBeInTheDocument();
    const readsBefore = seen.length;

    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw claim' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(seen.length).toBeGreaterThan(readsBefore));
  });

  it('does nothing when the withdrawal is cancelled', async () => {
    // No delete mock is registered, so a call to the server would surface as an alert.
    renderPage([expenseSummaryMock(), myExpensesTableMock([PENDING])]);
    const dialog = await askToWithdraw();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("shows the server's reason when the withdrawal is refused, and lets it be dismissed", async () => {
    renderPage([
      expenseSummaryMock(),
      myExpensesTableMock([PENDING]),
      deleteExpenseMock('exp-1', 'Finance is already reviewing this claim'),
    ]);
    const dialog = await askToWithdraw();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw claim' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Finance is already reviewing this claim');
    fireEvent.click(within(alert).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('logs, and does not bother the employee, when only the totals refresh fails', async () => {
    const warn = vi.spyOn(logs.portal.employee, 'warn').mockImplementation(() => undefined);
    const failingSummary: MockedResponse = {
      request: expenseSummaryMock().request,
      error: new Error('summary unavailable'),
    };
    renderPage([
      // The first read of the totals succeeds; the one after the withdrawal fails.
      { ...expenseSummaryMock(), maxUsageCount: 1 },
      failingSummary,
      myExpensesTableMock([PENDING]),
      deleteExpenseMock('exp-1'),
    ]);
    const dialog = await askToWithdraw();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw claim' }));

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        'ExpensesPage',
        'afterWrite',
        expect.objectContaining({ msg: 'Expense claim summary refresh failed' }),
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
