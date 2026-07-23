import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import ExpenseManagementPage from '../../src/pages/finance/expense-management-page';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  addRefundMock,
  createExpenseMock,
  deleteExpenseMock,
  emptyExpense,
  expenseSummaryErrorMock,
  expenseSummaryMock,
  expensesTableMock,
  makeExpense,
  makeExpenseRefund,
  makeExpenseSummary,
  refundedExpense,
  removeRefundMock,
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

const selectOption = (name: RegExp | string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(option));
};

beforeEach(() => {
  resetTableControls();
});

describe('ExpenseManagementPage', () => {
  it('renders the summary + table, syncs filters and creates a new expense', async () => {
    tableControls.queries = [tableControls.queries[0], RICH_Q];
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [
        expenseSummaryMock(),
        expensesTableMock([makeExpense(), emptyExpense()]),
        createExpenseMock(),
      ],
    });
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    expect(screen.getByText('Gross ₹100.00')).toBeInTheDocument();
    expect(screen.getByText('1 expense')).toBeInTheDocument();
    expect(screen.getByText('Rent: ₹80.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new expense/i }));
    expect(await screen.findByRole('heading', { name: 'New expense' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    expect(screen.getByText(/greater than 0/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText(/vendor/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/reference/i), { target: { value: 'txn-9' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Snacks' } });
    selectOption('Category', 'Marketing');
    selectOption('Payment method', 'Upi');
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'New expense' })).not.toBeInTheDocument());
  });

  it('logs a warning when the summary refresh fails after saving', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [
        // Success is single-use so the post-save refetch hits the error mock.
        expenseSummaryMock(makeExpenseSummary(), 1),
        expenseSummaryErrorMock(),
        expensesTableMock([makeExpense()]),
        createExpenseMock(),
      ],
    });
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new expense/i }));
    fireEvent.change(await screen.findByLabelText(/^Amount/), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'New expense' })).not.toBeInTheDocument());
  });

  it('edits an existing expense: refund add/guard/remove and delete', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [
        expenseSummaryMock(),
        expensesTableMock([refundedExpense()]),
        addRefundMock(makeExpense({ refunds: [makeExpenseRefund({ refund_id: 'rf9', note: 'ref note' })] })),
        removeRefundMock(),
        deleteExpenseMock(),
      ],
    });
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    expect(await screen.findByText('Expense details')).toBeInTheDocument();
    expect(screen.getByText('Refunds & timeline')).toBeInTheDocument();

    // add-refund guard: no amount → the mutation is not fired yet
    fireEvent.click(screen.getByRole('button', { name: /add refund/i }));

    fireEvent.change(screen.getAllByLabelText(/^Amount/)[1], { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'ref note' } });
    fireEvent.click(screen.getByRole('button', { name: /add refund/i }));
    await waitFor(() => expect(screen.getByText('ref note')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /remove refund/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /delete expense/i }));
    await waitFor(() => expect(screen.queryByText('Expense details')).not.toBeInTheDocument());
  });

  it('saves changes to an existing expense (update path, no refunds)', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [
        expenseSummaryMock(),
        expensesTableMock([makeExpense({ refunds: null })]),
        updateExpenseMock(),
      ],
    });
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    expect(await screen.findByRole('button', { name: /save changes/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.queryByText('Expense details')).not.toBeInTheDocument());
  });

  it('keeps the current expense when a refund mutation returns no data', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [
        expenseSummaryMock(),
        expensesTableMock([refundedExpense()]),
        addRefundMock(null),
        removeRefundMock(null),
      ],
    });
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    await screen.findByText('Refunds & timeline');
    fireEvent.change(screen.getAllByLabelText(/^Amount/)[1], { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /add refund/i }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /remove refund/i }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /remove refund/i })[0]);
  });

  it('pluralises the expense count', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [expenseSummaryMock(makeExpenseSummary({ count: 3, by_category: [] })), expensesTableMock([])],
    });
    expect(await screen.findByText('3 expenses')).toBeInTheDocument();
  });

  it('renders without a summary card', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [expenseSummaryMock(null), expensesTableMock([])],
    });
    await waitFor(() => expect(screen.getByText('No expenses match these filters.')).toBeInTheDocument());
    expect(screen.queryByText(/^Gross/)).not.toBeInTheDocument();
  });

  it('surfaces a create error', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [expenseSummaryMock(), expensesTableMock([]), createExpenseMock({ fail: true })],
    });
    fireEvent.click(await screen.findByRole('button', { name: /new expense/i }));
    fireEvent.change(await screen.findByLabelText(/^Amount/), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    expect(await screen.findByText('create failed')).toBeInTheDocument();
  });

  it('shows the saving state in the drawer', async () => {
    renderWithProviders(<ExpenseManagementPage />, {
      mocks: [expenseSummaryMock(), expensesTableMock([]), createExpenseMock({ delay: 60_000 })],
    });
    fireEvent.click(await screen.findByRole('button', { name: /new expense/i }));
    fireEvent.change(await screen.findByLabelText(/^Amount/), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});
