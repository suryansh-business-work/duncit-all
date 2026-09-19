/**
 * Finance > Expenses > Duncit Expenses — the ledger page, its summary chips and
 * the create/save paths of its drawer.
 *
 * Every screen here reads its dropdowns from `expenseOptions`, so each render
 * carries the four configured lists; a category, payment method and amount are
 * required before anything is sent, which is why every save below fills them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { logs } from '@duncit/logs';
import ExpenseManagementPage from '../../src/pages/finance/expense-management-page';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import { pickOption, typeInto } from '../expense-dom';
import { allExpenseOptionsMocks, type VarsMatcher } from '../mocks/expense-config.mock';
import {
  createExpenseMock,
  emptyExpense,
  expenseSummaryErrorMock,
  expenseSummaryMock,
  expensesTableMock,
  makeExpense,
  makeExpenseSummary,
  updateExpenseMock,
} from '../mocks/expense.mock';

const RICH_Q = {
  search: 'rent',
  filters: [{ field: 'category', op: 'eq', value: 'RENT' }],
  page: 1,
  pageSize: 25,
  sortBy: undefined,
  sortDir: 'asc' as const,
};

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<ExpenseManagementPage />, { mocks: [...allExpenseOptionsMocks(), ...mocks] });

const openNewExpense = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'New expense' }));
  return screen.findByRole('dialog', { name: 'New expense' });
};

/** The three fields a new expense cannot be saved without. */
const fillRequired = async (amount = '99') => {
  typeInto('Amount', amount);
  await pickOption('Category', 'Marketing');
  await pickOption('Payment method', 'UPI');
};

const drawerGone = (name: string) =>
  waitFor(() => expect(screen.queryByRole('dialog', { name })).toBeNull());

beforeEach(() => {
  resetTableControls();
});

describe('ExpenseManagementPage', () => {
  it('renders the summary + table, syncs filters and creates a new expense', async () => {
    tableControls.queries = [tableControls.queries[0], RICH_Q];
    const created = vi.fn<VarsMatcher>(() => true);
    renderPage([
      expenseSummaryMock(),
      expensesTableMock([makeExpense(), emptyExpense()]),
      createExpenseMock({ match: created }),
    ]);
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    expect(await screen.findByText('Gross 100.00')).toBeInTheDocument();
    expect(screen.getByText('Refund 20.00')).toBeInTheDocument();
    expect(screen.getByText('Net 80.00')).toBeInTheDocument();
    expect(screen.getByText('1 expense(s)')).toBeInTheDocument();
    // The by-category chip reads the configured label, not the stored key.
    expect(await screen.findByText('Rent: 80.00')).toBeInTheDocument();

    const drawer = await openNewExpense();
    expect(within(drawer).getByRole('heading', { name: 'New expense' })).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Add expense' }));
    expect(await within(drawer).findByText(/greater than 0/i)).toBeInTheDocument();
    expect(within(drawer).getByText('Pick a category')).toBeInTheDocument();
    expect(within(drawer).getByText('Pick how it was paid')).toBeInTheDocument();

    // A cleared date is refused on its own line, then put back.
    fireEvent.change(within(drawer).getByLabelText('Date'), { target: { value: '' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add expense' }));
    expect(await within(drawer).findByText('Pick the day the money left')).toBeInTheDocument();
    fireEvent.change(within(drawer).getByLabelText('Date'), {
      target: { value: '2026-08-01T10:00:00.000Z' },
    });

    await fillRequired('250');
    typeInto('Vendor / payee', 'Acme');
    typeInto('Reference / txn id', 'txn-9');
    typeInto('Description', 'Snacks');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Upload' }));

    fireEvent.click(within(drawer).getByRole('button', { name: 'Add expense' }));
    await drawerGone('New expense');
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          date: '2026-08-01T10:00:00.000Z',
          amount: 250,
          category: 'MARKETING',
          payment_method: 'UPI',
          vendor_name: 'Acme',
          reference: 'txn-9',
          description: 'Snacks',
          attachment_url: 'https://img.example/new.png',
          related_from_id: null,
          compensated_amount: 0,
          compensation_date: null,
        }),
      }),
    );
  });

  it('logs a warning when the summary refresh fails after saving', async () => {
    const warn = vi.spyOn(logs.portal.finance, 'warn').mockImplementation(() => undefined);
    renderPage([
      // Success is single-use so the post-save refetch hits the error mock.
      expenseSummaryMock(makeExpenseSummary(), 1),
      expenseSummaryErrorMock(),
      expensesTableMock([makeExpense()]),
      createExpenseMock(),
    ]);
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    const drawer = await openNewExpense();
    await fillRequired();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add expense' }));
    await drawerGone('New expense');
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('ExpenseManagementPage', 'handleSaved', {
        error: expect.any(Error),
        msg: 'Expense summary refresh failed',
      }),
    );
    warn.mockRestore();
  });

  it('saves changes to an existing expense (update path, no refunds)', async () => {
    const updated = vi.fn<VarsMatcher>(() => true);
    renderPage([
      expenseSummaryMock(),
      expensesTableMock([makeExpense({ refunds: [], refund_total: 0, net_amount: 100 })]),
      updateExpenseMock(updated),
    ]);
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    const drawer = await screen.findByRole('dialog', { name: 'Expense details' });
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Save' }));
    await drawerGone('Expense details');
    expect(updated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'e1',
        input: expect.objectContaining({ category: 'RENT', amount: 100, payment_method: 'BANK_TRANSFER' }),
      }),
    );
  });

  it('shows how many expenses the summary matched', async () => {
    renderPage([expenseSummaryMock(makeExpenseSummary({ count: 3, by_category: [] })), expensesTableMock([])]);
    expect(await screen.findByText('3 expense(s)')).toBeInTheDocument();
  });

  it('renders without a summary card while the summary is still loading', async () => {
    renderPage([expenseSummaryMock(makeExpenseSummary(), 50, 60_000), expensesTableMock([])]);
    await waitFor(() => expect(screen.getByText('No expenses match these filters.')).toBeInTheDocument());
    expect(screen.queryByText(/^Gross/)).not.toBeInTheDocument();
  });

  it('surfaces a create error and keeps the form open', async () => {
    renderPage([expenseSummaryMock(), expensesTableMock([]), createExpenseMock({ fail: true })]);
    const drawer = await openNewExpense();
    await fillRequired();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add expense' }));
    expect(await within(drawer).findByText('create failed')).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'New expense' })).toBeInTheDocument();
  });

  it('shows the saving state in the drawer', async () => {
    renderPage([expenseSummaryMock(), expensesTableMock([]), createExpenseMock({ delay: 60_000 })]);
    const drawer = await openNewExpense();
    await fillRequired();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add expense' }));
    await waitFor(() => expect(within(drawer).getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});
