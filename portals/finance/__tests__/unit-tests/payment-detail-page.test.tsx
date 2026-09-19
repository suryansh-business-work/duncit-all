import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import PaymentDetailPage from '../../src/pages/finance/payment-detail-page';
import { renderWithProviders } from '../testkit';
import { resetTableControls } from './mocks/table';
import { notifyError, notifySuccess } from './mocks/dialogs';
import {
  RETRY_REFUSED,
  makeArtifact,
  makeDetailPayment,
  makePaymentDetail,
  makePodBooking,
  makeStep,
  paymentDetailErrorMock,
  paymentDetailMock,
  retryPaymentStepsMock,
} from '../mocks/payment-detail.mock';

const mount = (mocks: readonly MockedResponse[]) =>
  renderWithProviders(<PaymentDetailPage />, {
    path: '/payment-logs/:id',
    entry: '/payment-logs/pd1',
    mocks,
    extra: <Route path="/payment-logs" element={<div data-testid="logs-probe">logs</div>} />,
  });

const waitForPage = () => screen.findByRole('heading', { name: 'DUN-PAY-4821' });

/** Money captured, but the booking core rolled back: refund or re-run the whole checkout. */
const rolledBackDetail = () =>
  makePaymentDetail({
    finalize_state: 'FAILED',
    finalize_error: null,
    needs_refund: true,
    can_retry_finalize: true,
    retryable_step_keys: [],
    steps: [
      makeStep(),
      makeStep({
        key: 'MEMBERSHIP',
        label: 'Booking created',
        status: 'FAILED',
        segment: 'POD',
        detail: 'Transaction rolled back: seat claim conflict',
        refs: [],
      }),
    ],
    artifacts: [
      makeArtifact(),
      makeArtifact({ key: 'POD_SEAT', label: 'Seat held in the pod', segment: 'POD', created: false, count: 0, refs: [] }),
    ],
    // The rolled-back transaction took the coin debit with it.
    coins: [],
    pod_booking: makePodBooking({ membership_id: null, membership_status: null, ticket_code: null, ticket_status: null }),
  });

/** A checkout that never got past the gateway: nothing charged, nothing owed. */
const unpaidDetail = () =>
  makePaymentDetail({
    payment: makeDetailPayment({
      invoice_no: null,
      paid_at: null,
      status: 'PENDING',
      coupon_code: null,
      coupon_discount: 0,
      ticket_discount_amount: 0,
      ticket_discount_pct: 0,
    }),
    finalize_state: 'NOT_STARTED',
    finalize_attempts: 1,
    finalize_error: null,
    retryable_step_keys: [],
    steps: [],
    // Nothing captured, so nothing was written; with no steps on record the
    // step-evidenced rows are excused rather than flagged.
    artifacts: [
      makeArtifact({ created: false, count: 0, refs: [] }),
      makeArtifact({ key: 'RECEIPT_EMAIL', label: 'Receipt e-mailed', created: false, count: 0, refs: [], not_applicable: true }),
      makeArtifact({ key: 'POD_SEAT', label: 'Seat held in the pod', segment: 'POD', created: false, count: 0, refs: ['14/20'] }),
    ],
    pod_booking: makePodBooking({ membership_id: null, membership_status: null, ticket_code: null, ticket_status: null }),
    coins: [],
    coupon: null,
    coins_redeemed: 0,
    coins_earned: 0,
    original_total: 1000,
  });

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('PaymentDetailPage — guards', () => {
  it('shows the loading guard while the audit is on its way', () => {
    mount([paymentDetailMock(makePaymentDetail(), { delay: 60_000 })]);
    expect(screen.getByTestId('qg-loading')).toBeInTheDocument();
  });

  it('shows the error guard when the audit cannot be read', async () => {
    mount([paymentDetailErrorMock()]);
    expect(await screen.findByTestId('qg-error')).toBeInTheDocument();
  });
});

describe('PaymentDetailPage — the audit', () => {
  it('renders the header, the money waterfall, the coins, the pod tab, the coupon and the customer', async () => {
    mount([paymentDetailMock()]);
    await waitForPage();

    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    const subtitle = screen.getByText(/^INV-2026-0042 · razorpay · /);
    expect(subtitle).not.toHaveTextContent('not paid');

    // CORE_DONE with an error on record: the amber "still finishing" banner, no refund alarm.
    expect(screen.getByText('Still finishing')).toBeInTheDocument();
    expect(screen.getByText('Receipt e-mail: SMTP timeout after 30s')).toBeInTheDocument();
    expect(screen.queryByText('Refund required')).not.toBeInTheDocument();

    // Original − tier − coupon − coins = the gross that was priced.
    expect(screen.getByText('₹1200.00')).toBeInTheDocument();
    expect(screen.getByText('Multi-ticket discount (5%)')).toBeInTheDocument();
    expect(screen.getByText('Coupon discount (YOGA10)')).toBeInTheDocument();
    expect(screen.getByText('− ₹100.00')).toBeInTheDocument();
    expect(screen.getByText('Coins redeemed (50)')).toBeInTheDocument();
    expect(screen.getAllByText('− ₹50.00')).toHaveLength(2);
    expect(screen.getByText('GST (18.00%)')).toBeInTheDocument();
    expect(screen.getByText('Platform fee (10.00% of subtotal)')).toBeInTheDocument();

    // Coins: one spent, one earned back at 2%.
    expect(screen.getByText('−50')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('2%')).toBeInTheDocument();

    // The payment section counts the attempts in the plural.
    expect(screen.getByText(/2 finalize attempts/)).toBeInTheDocument();

    // The pod tab opens first, because this payment booked a pod.
    expect(screen.getByRole('tab', { name: 'Pod' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Sunrise Yoga at Cubbon Park')).toBeInTheDocument();
    expect(screen.getByText('5% · −₹50.00')).toBeInTheDocument();

    expect(screen.getByText('Yoga Week 10% off')).toBeInTheDocument();
    expect(screen.queryByText('This coupon has since been deleted.')).not.toBeInTheDocument();
    expect(
      screen.getByText('12 MG Road, Near Trinity Metro, Bengaluru, Karnataka, 560001, India'),
    ).toBeInTheDocument();
  });

  it('reads an unpaid checkout plainly: no invoice, not paid, nothing to retry', async () => {
    mount([paymentDetailMock(unpaidDetail())]);
    await waitForPage();

    expect(screen.getByText(/^No invoice number · razorpay · not paid$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry all failed' })).not.toBeInTheDocument();
    expect(screen.queryByText('Still finishing')).not.toBeInTheDocument();
    expect(screen.queryByText('Checkout finalization failed')).not.toBeInTheDocument();
    expect(screen.getByText(/1 finalize attempt$/)).toBeInTheDocument();
    expect(screen.getByText('No coins were used on this payment.')).toBeInTheDocument();
    expect(screen.queryByText('Coupon')).not.toBeInTheDocument();
    expect(screen.queryByText('Multi-ticket discount (5%)')).not.toBeInTheDocument();
  });

  it('goes back to Payment Logs', async () => {
    mount([paymentDetailMock()]);
    await waitForPage();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Payment Logs' }));
    expect(screen.getByTestId('logs-probe')).toBeInTheDocument();
  });

  it('switches between the checkout tabs', async () => {
    mount([paymentDetailMock()]);
    await waitForPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Products' }));
    expect(await screen.findByText('This payment bought no products.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Products' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Gift card' }));
    expect(await screen.findByText('This payment bought no gift card.')).toBeInTheDocument();
  });
});

describe('PaymentDetailPage — re-running failed work', () => {
  it('confirms, re-runs everything owed and redraws the page from the reply', async () => {
    mount([paymentDetailMock(), retryPaymentStepsMock()]);
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'Retry all failed' }));
    expect(await screen.findByText('Re-run everything that failed?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByText('Re-run everything that failed?')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Retry all failed' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Re-run finished — this page is the fresh result.'),
    );
    // The mutation's reply IS the new audit: nothing left owed, so no banner and no button.
    await waitFor(() => expect(screen.queryByText('Still finishing')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Retry all failed' })).not.toBeInTheDocument();
    expect(screen.getByText(/3 finalize attempts/)).toBeInTheDocument();
    expect(screen.getByText('Sent to riya@duncit.com')).toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('names the refusal and re-reads the audit when a row re-run fails', async () => {
    const afterFailure = makePaymentDetail({
      finalize_attempts: 3,
      finalize_error: 'Receipt e-mail: mailbox unavailable',
    });
    mount([paymentDetailMock(), retryPaymentStepsMock({ fail: true }), paymentDetailMock(afterFailure)]);
    await waitForPage();

    const [rowRetry] = await screen.findAllByRole('button', { name: 'Re-run Receipt e-mailed' });
    fireEvent.click(rowRetry);

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(RETRY_REFUSED));
    expect(await screen.findByText('Receipt e-mail: mailbox unavailable')).toBeInTheDocument();
    expect(screen.getByText(/3 finalize attempts/)).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('locks every retry while one row is re-running', async () => {
    mount([paymentDetailMock(), retryPaymentStepsMock({ delay: 60_000 })]);
    await waitForPage();

    const rowButtons = await screen.findAllByRole('button', { name: 'Re-run Receipt e-mailed' });
    fireEvent.click(rowButtons[0]);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry all failed' })).toBeDisabled());
    for (const button of screen.getAllByRole('button', { name: 'Re-run Receipt e-mailed' })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('asks before re-running a rolled-back core and shows the run in the header', async () => {
    mount([paymentDetailMock(rolledBackDetail()), retryPaymentStepsMock({ delay: 60_000 })]);
    await waitForPage();

    expect(screen.getByText('Refund required')).toBeInTheDocument();
    expect(screen.getByText('Checkout finalization failed')).toBeInTheDocument();
    // The pod stream is where the missing seat is — its tab carries the warning.
    expect(within(screen.getByRole('tab', { name: 'Pod' })).getByTestId('ErrorOutlinedIcon')).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: 'Products' })).queryByTestId('ErrorOutlinedIcon')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry all failed' }));
    expect(await screen.findByText('Re-run the whole checkout?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.queryByText('Re-run the whole checkout?')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Re-running…' })).toBeDisabled();
  });
});
