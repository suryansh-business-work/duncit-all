/**
 * Duncit Expenses — an existing expense: the ledger row it is listed as, and
 * the drawer it opens in (refund timeline, delete confirmation, close).
 *
 * Split out of expense.test.tsx, which keeps the page, summary and create
 * paths.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ExpenseManagementPage from '../../src/pages/finance/expense-management-page';
import { resetTableControls } from './mocks/table';
import { flush, renderWithProviders } from '../testkit';
import {
  allExpenseOptionsMocks,
  makeRelatedEntity,
  relatedEntitiesMock,
  relatedEntityMock,
  type VarsMatcher,
} from '../mocks/expense-config.mock';
import {
  addRefundMock,
  attributedExpense,
  deleteExpenseMock,
  emptyExpense,
  expenseSummaryMock,
  expensesTableMock,
  makeExpense,
  makeExpenseRefund,
  refundedExpense,
  removeRefundMock,
  typeOnlyExpense,
} from '../mocks/expense.mock';

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<ExpenseManagementPage />, {
    mocks: [...allExpenseOptionsMocks(), expenseSummaryMock(), ...mocks],
  });

/** Opens the first ledger row and returns its drawer. */
const openFirstRow = async (description = 'Office rent') => {
  await waitFor(() => expect(screen.getByText(description)).toBeInTheDocument());
  fireEvent.click(screen.getAllByTestId('row-open')[0]);
  return screen.findByRole('dialog', { name: 'Expense details' });
};

const cellText = (field: string) => screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);

beforeEach(() => {
  resetTableControls();
});

describe('ExpenseDrawer — refunds and delete', () => {
  it('edits an existing expense: refund add/guard/remove and delete', async () => {
    const refundVars = vi.fn<VarsMatcher>(() => true);
    renderPage([
      expensesTableMock([refundedExpense()]),
      addRefundMock(
        makeExpense({ refunds: [makeExpenseRefund({ refund_id: 'rf9', note: 'ref note' })] }),
        refundVars,
      ),
      removeRefundMock(),
      deleteExpenseMock(),
    ]);
    const drawer = await openFirstRow();
    expect(within(drawer).getByText('Refunds & timeline')).toBeInTheDocument();
    expect(within(drawer).getByText('Gross ₹100.00')).toBeInTheDocument();
    expect(within(drawer).getByText('Refunded ₹25.00')).toBeInTheDocument();
    expect(within(drawer).getByText('Net ₹75.00')).toBeInTheDocument();
    expect(within(drawer).getByText('Expense recorded')).toBeInTheDocument();
    expect(within(drawer).getByText('partial')).toBeInTheDocument();
    // A refund recorded without a note still reads as one.
    expect(within(drawer).getByText('Refund received')).toBeInTheDocument();

    // add-refund guard: no amount → the mutation is not fired
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add refund' }));
    // …and no date either, even with an amount typed.
    fireEvent.change(within(drawer).getAllByLabelText(/^Amount/)[1], { target: { value: '10' } });
    fireEvent.change(within(drawer).getByLabelText('Refund date'), { target: { value: '' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add refund' }));
    await flush();
    expect(refundVars).not.toHaveBeenCalled();

    fireEvent.change(within(drawer).getByLabelText('Refund date'), {
      target: { value: '2024-03-01T10:00:00.000Z' },
    });
    fireEvent.change(within(drawer).getByLabelText('Note'), { target: { value: 'ref note' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add refund' }));
    await waitFor(() => expect(within(drawer).getByText('ref note')).toBeInTheDocument());
    expect(refundVars).toHaveBeenCalledWith({
      id: 'e1',
      input: { date: '2024-03-01T10:00:00.000Z', amount: 10, note: 'ref note' },
    });

    fireEvent.click(within(drawer).getAllByRole('button', { name: 'Remove refund' })[0]);
    // The server's copy after the removal holds only the original refund.
    await waitFor(() => expect(within(drawer).queryByText('ref note')).toBeNull());
    expect(within(drawer).getByText('partial')).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete expense' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete expense' });
    expect(
      within(confirm).getByText('This expense and every refund recorded against it will be removed.'),
    ).toBeInTheDocument();
    fireEvent.click(within(confirm).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Expense details' })).toBeNull());
  });

  it('keeps the current expense when a refund mutation returns no data', async () => {
    renderPage([expensesTableMock([refundedExpense()]), addRefundMock(null), removeRefundMock(null)]);
    const drawer = await openFirstRow();
    fireEvent.change(within(drawer).getAllByLabelText(/^Amount/)[1], { target: { value: '10' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add refund' }));
    // The add went through (the box is cleared for the next one)…
    await waitFor(() => expect(within(drawer).getAllByLabelText(/^Amount/)[1]).toHaveValue(null));
    await waitFor(() =>
      expect(within(drawer).getAllByRole('button', { name: 'Remove refund' }).length).toBeGreaterThan(0),
    );
    fireEvent.click(within(drawer).getAllByRole('button', { name: 'Remove refund' })[0]);
    await flush();
    // Nothing came back, so the timeline keeps what it already showed.
    expect(within(drawer).getByText('partial')).toBeInTheDocument();
    expect(within(drawer).getByText('Refund received')).toBeInTheDocument();
  });

  it('says why a delete failed, and backs out of the confirmation on Cancel', async () => {
    renderPage([expensesTableMock([makeExpense()]), deleteExpenseMock({ fail: true })]);
    const drawer = await openFirstRow();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete expense' }));
    const first = await screen.findByRole('dialog', { name: 'Delete expense' });
    fireEvent.click(within(first).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete expense' })).toBeNull());

    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete expense' }));
    const second = await screen.findByRole('dialog', { name: 'Delete expense' });
    fireEvent.click(within(second).getByTestId('confirm-dialog-confirm'));
    expect(await within(drawer).findByText('Expense not found')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete expense' })).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Expense details' })).toBeInTheDocument();
  });
});

describe('ExpenseTable — what each row says', () => {
  it('reads Related From, vendor, payer and compensation off every row', async () => {
    renderPage([expensesTableMock([attributedExpense(), typeOnlyExpense(), emptyExpense()])]);
    await waitFor(() => expect(screen.getByText('Court hire')).toBeInTheDocument());
    // The type reads its configured label once the list has answered.
    await waitFor(() =>
      expect(cellText('related_from_type')).toEqual(['Smash ArenaVenue', '—Pod', 'Not attributed']),
    );
    expect(cellText('vendor_name')).toEqual(['LandlordReceipt', 'LandlordReceipt', '—']);
    expect(cellText('paid_by')).toEqual(['Asha', '—', '—']);
    expect(cellText('compensation_status')).toEqual([
      'Partially compensated',
      'Rejected',
      'Pending compensation',
    ]);
    expect(cellText('compensated_amount')).toEqual(['40.00', '0.00', '0.00']);
  });

  it('opens a receipt without the click reaching the row behind it', async () => {
    renderPage([expensesTableMock([makeExpense()])]);
    const receipt = await screen.findByRole('link', { name: 'Receipt' });
    expect(receipt).toHaveAttribute('href', 'https://a/receipt.pdf');
    // jsdom has no navigation; keep it from trying.
    receipt.addEventListener('click', (event) => event.preventDefault());
    const reachedDocument = vi.fn();
    document.addEventListener('click', reachedDocument);
    fireEvent.click(receipt);
    document.removeEventListener('click', reachedDocument);
    expect(reachedDocument).not.toHaveBeenCalled();
  });

  it('opens an attributed expense on the entity it names and closes on Close', async () => {
    renderPage([
      expensesTableMock([attributedExpense()]),
      relatedEntitiesMock('VENUE'),
      relatedEntityMock(makeRelatedEntity()),
    ]);
    const drawer = await openFirstRow('Court hire');
    await waitFor(() =>
      expect(within(drawer).getByRole('combobox', { name: 'Related entity' })).toHaveValue('Smash Arena'),
    );
    expect(within(drawer).getByLabelText('Compensated amount')).toHaveValue(40);
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Expense details' })).toBeNull());
  });
});
