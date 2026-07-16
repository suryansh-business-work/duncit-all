import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import ExpenseManagementPage from '../../src/pages/finance/expense-management-page';
import { resetTableControls, tableControls } from './mocks/table';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn(), useApolloClient: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseApolloClient = vi.mocked(useApolloClient);

const RICH_Q = {
  search: 'rent',
  filters: [{ field: 'category', op: 'eq', value: 'RENT' }],
  page: 1,
  pageSize: 25,
  sortBy: undefined,
  sortDir: 'asc' as const,
};

const rowFull = {
  id: 'e1',
  date: '2024-01-01',
  category: 'RENT',
  amount: 100,
  refund_total: 20,
  net_amount: 80,
  description: 'Office rent',
  vendor_name: 'Landlord',
  payment_method: 'BANK_TRANSFER',
  reference: 'ref-1',
  attachment_url: 'https://a/receipt.pdf',
  refunds: [{ refund_id: 'rf1', date: '2024-01-02', amount: 20, note: 'partial' }],
  created_at: '2024-01-01',
};
const rowEmpty = {
  id: 'e2',
  date: 'bad-date',
  category: 'OTHER',
  amount: 50,
  refund_total: 0,
  net_amount: 50,
  description: '',
  vendor_name: '',
  payment_method: 'CASH',
  reference: '',
  attachment_url: '',
  refunds: [],
  created_at: '2024-01-01',
};

const summary = {
  expenseSummary: { gross_total: 100, refund_total: 20, total: 80, count: 1, by_category: [{ category: 'RENT', total: 80 }] },
};

const selectOption = (name: RegExp | string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(option));
};

const resolveClient = (rows: unknown[]) => ({
  query: vi.fn().mockResolvedValue({ data: { expensesTable: { rows, total: rows.length } } }),
});

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseMutation.mockReset();
  mockedUseApolloClient.mockReset();
  resetTableControls();
  tableControls.queries = [tableControls.queries[0], RICH_Q]; // hit both summary-filter key branches
});

describe('ExpenseManagementPage', () => {
  it('renders the summary + table and creates a new expense', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('summary refresh failed')); // exercise the catch
    mockedUseQuery.mockReturnValue({ data: summary, refetch } as any);
    mockedUseMutation.mockReturnValue([vi.fn().mockResolvedValue({ data: {} }), { loading: false }] as any);
    mockedUseApolloClient.mockReturnValue(resolveClient([rowFull, rowEmpty]) as any);

    renderUI(<ExpenseManagementPage />);
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    expect(screen.getByText('Gross ₹100.00')).toBeInTheDocument();
    expect(screen.getByText('1 expense')).toBeInTheDocument();
    expect(screen.getByText('Rent: ₹80.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new expense/i }));
    expect(await screen.findByRole('heading', { name: 'New expense' })).toBeInTheDocument();

    // amount guard
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    expect(screen.getByText(/greater than 0/i)).toBeInTheDocument();

    // fill every field (each inline onChange must run)
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText(/vendor/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/reference/i), { target: { value: 'txn-9' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Snacks' } });
    selectOption('Category', 'Marketing');
    selectOption('Payment method', 'Upi');
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'New expense' })).not.toBeInTheDocument());
  });

  it('edits an existing expense: refund add/guard/remove and delete', async () => {
    const refundedExpense = {
      ...rowFull,
      refunds: [{ refund_id: 'rf1', date: '2024-01-02', amount: 20, note: 'partial' }],
    };
    const mutate = vi.fn().mockResolvedValue({
      data: { addExpenseRefund: { ...refundedExpense, net_amount: 60 }, removeExpenseRefund: { ...refundedExpense, net_amount: 100 } },
    });
    mockedUseQuery.mockReturnValue({ data: summary, refetch: vi.fn().mockResolvedValue({}) } as any);
    mockedUseMutation.mockReturnValue([mutate, { loading: false }] as any);
    mockedUseApolloClient.mockReturnValue(resolveClient([refundedExpense]) as any);

    renderUI(<ExpenseManagementPage />);
    await waitFor(() => expect(screen.getByText('Office rent')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    expect(await screen.findByText('Expense details')).toBeInTheDocument();
    expect(screen.getByText('Refunds & timeline')).toBeInTheDocument();

    // add-refund guard (no amount)
    fireEvent.click(screen.getByRole('button', { name: /add refund/i }));
    expect(mutate).not.toHaveBeenCalled();

    // add a refund (the second Amount field belongs to the refund timeline)
    fireEvent.change(screen.getAllByLabelText('Amount')[1], { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'ref note' } });
    fireEvent.click(screen.getByRole('button', { name: /add refund/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());

    // remove the existing refund
    fireEvent.click(screen.getByRole('button', { name: /remove refund/i }));
    // delete the expense
    fireEvent.click(screen.getByRole('button', { name: /delete expense/i }));
    await waitFor(() => expect(screen.queryByText('Expense details')).not.toBeInTheDocument());
  });

  it('renders without a summary card', async () => {
    mockedUseQuery.mockReturnValue({ data: undefined, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    mockedUseApolloClient.mockReturnValue(resolveClient([]) as any);
    renderUI(<ExpenseManagementPage />);
    await waitFor(() => expect(screen.getByText('No expenses match these filters.')).toBeInTheDocument());
    expect(screen.queryByText(/^Gross/)).not.toBeInTheDocument();
  });

  it('surfaces a create error', async () => {
    mockedUseQuery.mockReturnValue({ data: summary, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('create failed')), { loading: false }] as any);
    mockedUseApolloClient.mockReturnValue(resolveClient([]) as any);
    renderUI(<ExpenseManagementPage />);
    fireEvent.click(screen.getByRole('button', { name: /new expense/i }));
    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
    expect(await screen.findByText('create failed')).toBeInTheDocument();
  });

  it('shows the saving state in the drawer', async () => {
    mockedUseQuery.mockReturnValue({ data: summary, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    mockedUseApolloClient.mockReturnValue(resolveClient([]) as any);
    renderUI(<ExpenseManagementPage />);
    fireEvent.click(screen.getByRole('button', { name: /new expense/i }));
    expect(await screen.findByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
