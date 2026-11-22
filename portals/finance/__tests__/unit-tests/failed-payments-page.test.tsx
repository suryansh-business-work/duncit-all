/**
 * Finance › Failed Payments list: who may act, the refund confirm (amount +
 * Razorpay id, one idempotency key per opened dialog), the review / not
 * refundable decisions and their refusals.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import FailedPaymentsPage from '../../src/pages/finance/failed-payments-page';
import { renderWithProviders } from '../testkit';
import { resetTableControls } from './mocks/table';
import { notifySuccess } from './mocks/dialogs';
import { resetUserContext, userContextControls } from './mocks/user-context';
import {
  failedPaymentMutationMock,
  failedPaymentsTableErrorMock,
  failedPaymentsTableMock,
  makeFailedPaymentDetail,
  makeFailedPaymentRow,
} from '../mocks/failed-payments.mock';

function CaseProbe() {
  const { id } = useParams();
  return <div data-testid="case-probe">{id}</div>;
}

const mount = (mocks: Parameters<typeof renderWithProviders>[1]['mocks']) =>
  renderWithProviders(<FailedPaymentsPage />, {
    mocks,
    extra: <Route path="/failed-payments/:id" element={<CaseProbe />} />,
  });

const yellowRow = () =>
  makeFailedPaymentRow({
    id: 'fp2',
    verification_status: 'UNMATCHED',
    highlight: 'YELLOW',
    can_refund: false,
    needs_review: true,
  });

const notCapturedRow = () =>
  makeFailedPaymentRow({
    id: 'fp3',
    verification_status: 'NOT_CAPTURED',
    highlight: 'NONE',
    can_refund: false,
    can_mark_not_refundable: true,
  });

let uuid = 0;
beforeEach(() => {
  resetTableControls();
  resetUserContext();
  notifySuccess.mockClear();
  uuid = 0;
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
    uuid += 1;
    return `00000000-0000-4000-8000-00000000000${uuid}` as ReturnType<typeof crypto.randomUUID>;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('FailedPaymentsPage', () => {
  it('lists the cases for a read-only seat with no decision buttons and says why', async () => {
    userContextControls.user = { roles: ['FINANCE_USER'] };
    mount([failedPaymentsTableMock([makeFailedPaymentRow()])]);

    expect(screen.getByRole('heading', { name: 'Failed Payments' })).toBeInTheDocument();
    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByTestId('failed-payments-read-only')).toHaveTextContent('need a Finance Manager');
    expect(screen.queryByTestId('failed-payment-action-refund')).not.toBeInTheDocument();
  });

  it('offers each decision only on the rows ready for it, to a Finance Manager', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    mount([failedPaymentsTableMock([makeFailedPaymentRow(), yellowRow(), notCapturedRow()])]);

    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('failed-payment-action-refund')).toBeInTheDocument();
    expect(within(rows[0]).queryByTestId('failed-payment-action-review')).not.toBeInTheDocument();
    expect(within(rows[1]).getByTestId('failed-payment-action-review')).toBeInTheDocument();
    expect(within(rows[1]).queryByTestId('failed-payment-action-refund')).not.toBeInTheDocument();
    expect(within(rows[2]).getByTestId('failed-payment-action-not-refundable')).toBeInTheDocument();
    expect(screen.queryByTestId('failed-payments-read-only')).not.toBeInTheDocument();
  });

  it('opens the case when a row is clicked', async () => {
    mount([failedPaymentsTableMock([makeFailedPaymentRow()])]);
    fireEvent.click(await screen.findByTestId('row-open'));
    expect(screen.getByTestId('case-probe')).toHaveTextContent('fp1');
  });

  it('shows the empty state, and the server refusal when the list cannot load', async () => {
    const first = mount([failedPaymentsTableMock([])]);
    expect(await screen.findByText('No failed payments.')).toBeInTheDocument();
    first.unmount();

    mount([failedPaymentsTableErrorMock('Access Denied')]);
    expect(await screen.findByTestId('table-error')).toHaveTextContent('Access Denied');
  });

  it('confirms a refund with the amount and Razorpay id, and retries with the SAME request id', async () => {
    userContextControls.user = { roles: ['SUPER_ADMIN'] };
    const calls: Record<string, unknown>[] = [];
    const tableCalls: unknown[] = [];
    mount([
      failedPaymentsTableMock([makeFailedPaymentRow()], (v) => tableCalls.push(v)),
      failedPaymentMutationMock('initiateFailedPaymentRefund', 'Razorpay is unreachable', (v) => calls.push(v)),
      failedPaymentMutationMock('initiateFailedPaymentRefund', makeFailedPaymentDetail({ can_refund: false }), (v) => calls.push(v)),
    ]);

    fireEvent.click(await screen.findByTestId('failed-payment-action-refund'));
    const dialog = screen.getByRole('dialog', { name: 'Refund this payment' });
    expect(within(dialog).getByText('Refund ₹499.00 to Riya Sharma through Razorpay?')).toBeInTheDocument();
    expect(within(dialog).getByTestId('failed-payment-refund-payment-id')).toHaveTextContent('pay_RZP123');

    fireEvent.click(within(dialog).getByTestId('failed-payment-refund-confirm'));
    expect(await within(dialog).findByText('Razorpay is unreachable')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByTestId('failed-payment-refund-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Refund sent to Razorpay.'));
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ caseId: 'fp1', clientRequestId: calls[1].clientRequestId });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The list reloads so the row shows its new state.
    await waitFor(() => expect(tableCalls.length).toBeGreaterThan(1));
  });

  it('gives a newly opened refund dialog a new request id, and Cancel sends nothing', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentsTableMock([makeFailedPaymentRow({ razorpay_payment_id: null })]),
      failedPaymentMutationMock('initiateFailedPaymentRefund', makeFailedPaymentDetail(), (v) => calls.push(v)),
    ]);

    fireEvent.click(await screen.findByTestId('failed-payment-action-refund'));
    expect(screen.getByTestId('failed-payment-refund-payment-id')).toHaveTextContent('—');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('failed-payment-action-refund'));
    fireEvent.click(screen.getByTestId('failed-payment-refund-confirm'));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].clientRequestId).toBe('00000000-0000-4000-8000-000000000002');
  });

  it('refuses a rejection without a note, then sends the rejection with it', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentsTableMock([yellowRow()]),
      failedPaymentMutationMock('reviewFailedPayment', makeFailedPaymentDetail({ id: 'fp2' }), (v) => calls.push(v)),
    ]);

    fireEvent.click(await screen.findByTestId('failed-payment-action-review'));
    const dialog = screen.getByRole('dialog', { name: 'Review the evidence' });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Decision' }));
    fireEvent.click(screen.getByRole('option', { name: 'Reject' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save review' }));
    expect(await within(dialog).findByText('Add a note.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Note' }), { target: { value: 'Screenshot is of another merchant' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Review saved.'));
    expect(calls[0]).toMatchObject({ caseId: 'fp2', decision: 'REJECTED', note: 'Screenshot is of another merchant' });
  });

  it('approves without a note', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentsTableMock([yellowRow()]),
      failedPaymentMutationMock('reviewFailedPayment', makeFailedPaymentDetail({ id: 'fp2' }), (v) => calls.push(v)),
    ]);
    fireEvent.click(await screen.findByTestId('failed-payment-action-review'));
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ decision: 'APPROVED', note: '' });
  });

  it('closes a never-captured case as not refundable with a required note, showing a refusal inline', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentsTableMock([notCapturedRow()]),
      failedPaymentMutationMock('markFailedPaymentNotRefundable', 'Only NOT_CAPTURED cases can be closed', (v) => calls.push(v)),
      failedPaymentMutationMock('markFailedPaymentNotRefundable', makeFailedPaymentDetail({ id: 'fp3' }), (v) => calls.push(v)),
    ]);

    fireEvent.click(await screen.findByTestId('failed-payment-action-not-refundable'));
    const dialog = screen.getByRole('dialog', { name: 'Close as not refundable' });
    expect(within(dialog).queryByRole('combobox', { name: 'Decision' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close the case' }));
    expect(await within(dialog).findByText('Add a note.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Note' }), { target: { value: 'Bank reversal in 5-7 days' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close the case' }));
    expect(await within(dialog).findByText('Only NOT_CAPTURED cases can be closed')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close the case' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Case closed as not refundable.'));
    expect(calls[0]).toEqual({ caseId: 'fp3', note: 'Bank reversal in 5-7 days', clientRequestId: calls[1].clientRequestId });
  });
});
