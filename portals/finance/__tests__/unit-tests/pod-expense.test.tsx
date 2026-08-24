/**
 * Finance > Pod Expenses.
 *
 * The screen answers one question — what has Duncit spent to put each pod on,
 * and which of those spends is still missing its bill — so the assertions here
 * are about that number staying honest: the roll-up a row shows, the "bills
 * uploaded" split, the amber the tiles turn when a bill is outstanding, and the
 * drawer's header reading the pod back from the server rather than trusting the
 * snapshot the list opened it with.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import PodExpensePage from '../../src/pages/finance/pod-expense-page';
import { renderWithProviders } from '../testkit';
import { resetTableControls, tableControls } from './mocks/table';
import {
  billlessExpense,
  createPodExpenseMock,
  deletePodExpenseMock,
  makePodExpense,
  makePodExpensePodRow,
  podExpensePodSummaryMock,
  podExpenseSummaryErrorMock,
  podExpenseSummaryMock,
  settledPodExpenseSummary,
  unnumberedBillExpense,
  untouchedPodRow,
  updatePodExpenseMock,
} from '../mocks/pod-expense.mock';

const seedTables = () => {
  tableControls.rowsByKey = {
    podExpensePodsTable: [makePodExpensePodRow(), untouchedPodRow()],
    podExpensesTable: [makePodExpense(), unnumberedBillExpense(), billlessExpense()],
  };
};

beforeEach(() => {
  resetTableControls();
  seedTables();
});

const cellText = (field: string) =>
  screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);

const tile = (index: number) => screen.getAllByTestId('stat-card')[index]!;

/** Waits for the pods list, then opens the drawer on the first pod. */
const openFirstPod = async () => {
  expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
  fireEvent.click(screen.getAllByTestId('row-open')[0]!);
  await screen.findByRole('button', { name: 'Add expense' });
};

const openNewEntryForm = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
  await screen.findByLabelText('Spend date');
};

describe('PodExpensePage — the pods list', () => {
  it('rolls each pod up into a row and tops the page with the KPI tiles', async () => {
    renderWithProviders(<PodExpensePage />, { mocks: [podExpenseSummaryMock()] });

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByText('DUN-POD-4821')).toBeInTheDocument();
    expect(cellText('expense_total')).toEqual(['₹2500.00', '₹0.00']);
    // "bills / entries": the first pod is short one bill, the second has
    // nothing recorded against it at all — and is still a row, because it is
    // the row you click to record the first one.
    expect(cellText('bill_count')).toEqual(['2 / 3', '0 / 0']);
    expect(cellText('expense_count')).toEqual(['3', '0']);
    expect(screen.getAllByTestId('status-chip').map((chip) => chip.textContent)).toEqual([
      'Completed',
      'Upcoming',
    ]);
    // A pod nothing has been spent on has no "last expense" date to show.
    expect(cellText('last_expense_at')[1]).toBe('—');

    expect(within(tile(0)).getByTestId('stat-value')).toHaveTextContent('₹2500.00');
    expect(within(tile(0)).getByTestId('stat-hint')).toHaveTextContent('Entries recorded: 3');
    expect(within(tile(1)).getByTestId('stat-value')).toHaveTextContent('₹900.00');
    expect(within(tile(2)).getByTestId('stat-value')).toHaveTextContent('1');
    expect(within(tile(3)).getByTestId('stat-value')).toHaveTextContent('2 / 3');
    expect(within(tile(3)).getByTestId('stat-hint')).toHaveTextContent('Still missing a bill: 1');
    expect(within(tile(3)).getByTestId('stat-hint')).toHaveAttribute(
      'data-hint-color',
      'warning.main',
    );

    expect(screen.getByText('Venue Rent: ₹2000.00')).toBeInTheDocument();
    expect(screen.getByText('Refreshments: ₹500.00')).toBeInTheDocument();
  });

  it('greens the bills tile and drops the category card once every bill is in', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(settledPodExpenseSummary())],
    });

    // Wait on a value only the answer can produce, so this cannot pass on the
    // pre-data render — which also reads "missing a bill: 0".
    expect(await screen.findByText('3 / 3')).toBeInTheDocument();
    expect(within(tile(3)).getByTestId('stat-hint')).toHaveTextContent('Still missing a bill: 0');
    expect(within(tile(3)).getByTestId('stat-hint')).toHaveAttribute(
      'data-hint-color',
      'success.main',
    );
    expect(screen.queryByText('Spend by category')).toBeNull();
  });

  it('shows the tiles loading, then reads a failed summary as zero rather than blank', async () => {
    renderWithProviders(<PodExpensePage />, { mocks: [podExpenseSummaryErrorMock()] });

    expect(screen.getAllByTestId('stat-loading')).toHaveLength(4);

    await waitFor(() => expect(screen.queryByTestId('stat-loading')).toBeNull());
    // No settings answered either, so there is no currency symbol to print.
    expect(within(tile(0)).getByTestId('stat-value')).toHaveTextContent('0.00');
    expect(within(tile(3)).getByTestId('stat-value')).toHaveTextContent('0 / 0');
    expect(screen.queryByText('Spend by category')).toBeNull();
  });

  it('narrows the list to pods with expenses, then to the ones missing a bill', async () => {
    renderWithProviders(<PodExpensePage />, { mocks: [podExpenseSummaryMock()] });
    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();

    const recorded = screen.getByRole('tab', { name: 'With expenses' });
    fireEvent.click(recorded);
    await waitFor(() => expect(recorded).toHaveAttribute('aria-selected', 'true'));

    const missing = screen.getByRole('tab', { name: 'Bill missing' });
    fireEvent.click(missing);
    await waitFor(() => expect(missing).toHaveAttribute('aria-selected', 'true'));
    expect(recorded).toHaveAttribute('aria-selected', 'false');
  });
});

describe('PodExpenseDrawer — one pod’s ledger', () => {
  it('opens on the clicked pod, reading its running total back from the server', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [
        podExpenseSummaryMock(),
        podExpensePodSummaryMock(makePodExpensePodRow({ expense_total: 2600, bill_count: 3 })),
      ],
    });
    await openFirstPod();

    // The header is the SERVER's row, not the snapshot the list opened it with.
    expect(await screen.findByText('Spent ₹2600.00')).toBeInTheDocument();
    expect(screen.getByText('Bills: 3 / 3')).toBeInTheDocument();

    expect(screen.getByText('Court booking')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'INV-14' })).toHaveAttribute(
      'href',
      'https://img.duncit.com/bill.pdf',
    );
    // A bill was uploaded but never numbered, and one spend has no bill at all.
    expect(screen.getByRole('link', { name: 'View bill' })).toBeInTheDocument();
    expect(screen.getByText('No bill')).toBeInTheDocument();
    // The unnamed vendor reads as an em-dash rather than an empty cell.
    expect(cellText('vendor_name')).toEqual(['Smash Arena', '—', 'Namma Cabs']);
  });

  it('falls back to the row that opened it while the server has answered nothing', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(), podExpensePodSummaryMock(null)],
    });
    await openFirstPod();

    expect(screen.getByText('Spent ₹2500.00')).toBeInTheDocument();
    expect(screen.getByText('Bills: 2 / 3')).toBeInTheDocument();
  });

  it('records a new expense against the pod, refusing one with no amount', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(), podExpensePodSummaryMock(), createPodExpenseMock()],
    });
    await openFirstPod();
    await openNewEntryForm();

    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByText('Enter an amount greater than 0')).toBeInTheDocument();

    // Clearing the date is its own refusal — a spend has to be dated.
    fireEvent.change(screen.getByLabelText('Spend date'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByText('Pick the date the money was spent')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Spend date'), {
      target: { value: '2026-08-22T00:00:00.000Z' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText('Vendor / payee'), { target: { value: 'Smash Arena' } });
    fireEvent.change(screen.getByLabelText('Reference / txn id'), { target: { value: 'txn-99' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Court booking' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    await waitFor(() => expect(screen.queryByLabelText('Spend date')).toBeNull());
  });

  it('edits an entry, and leaves the amount typed as a number', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(), podExpensePodSummaryMock(), updatePodExpenseMock()],
    });
    await openFirstPod();

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    expect(await screen.findByDisplayValue('Smash Arena')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveValue(2000);

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '' } });
    expect(screen.getByLabelText('Amount')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2100' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByLabelText('Spend date')).toBeNull());
  });

  it('backs out of the form without writing anything', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(), podExpensePodSummaryMock()],
    });
    await openFirstPod();
    await openNewEntryForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByLabelText('Spend date')).toBeNull());
    expect(screen.getByText('Court booking')).toBeInTheDocument();
  });

  it('asks before deleting an entry, and takes no for an answer', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(), podExpensePodSummaryMock(), deletePodExpenseMock()],
    });
    await openFirstPod();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'This removes the entry and its bill from the pod. It cannot be undone.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('surfaces what the server refused, on a write and on a delete', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [
        podExpenseSummaryMock(),
        podExpensePodSummaryMock(),
        createPodExpenseMock(true),
        deletePodExpenseMock(true),
      ],
    });
    await openFirstPod();
    await openNewEntryForm();

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(
      await screen.findByText('Expense amount must be greater than 0'),
    ).toBeInTheDocument();
    // The form stays open on a refusal — the typing is not thrown away.
    expect(screen.getByLabelText('Spend date')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const rowDeletes = await screen.findAllByRole('button', { name: 'Delete' });
    fireEvent.click(rowDeletes[0]!);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Pod expense not found')).toBeInTheDocument();
  });

  it('never carries an open form from one pod over to the next', async () => {
    renderWithProviders(<PodExpensePage />, {
      mocks: [podExpenseSummaryMock(), podExpensePodSummaryMock()],
    });
    await openFirstPod();
    await openNewEntryForm();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByLabelText('Spend date')).toBeNull());

    fireEvent.click(screen.getAllByTestId('row-open')[1]!);
    expect(await screen.findByRole('button', { name: 'Add expense' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Spend date')).toBeNull();
  });

  it('still saves when neither list has handed back a way to refresh itself', async () => {
    // A table that never registered a refetch is the state of the screen for
    // its whole first paint; a save then must not reach for a function that is
    // not there yet.
    tableControls.setRefetch = false;
    renderWithProviders(<PodExpensePage />, {
      mocks: [
        // Single-use, so the refresh after the save lands on the error mock and
        // the failure is logged instead of thrown.
        podExpenseSummaryMock(undefined, '₹', 1),
        podExpenseSummaryErrorMock(),
        podExpensePodSummaryMock(),
        createPodExpenseMock(),
      ],
    });
    await openFirstPod();
    await openNewEntryForm();

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(screen.queryByLabelText('Spend date')).toBeNull());
    expect(screen.getByText('Court booking')).toBeInTheDocument();
  });
});
