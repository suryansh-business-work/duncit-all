/**
 * Rented items › one rental's detail on the Finance board, as the REAL
 * @duncit/venue-rentals desk renders it (only the AG-Grid table, the toasts and
 * the photo picker are this workspace's stubs): a row opens the detail and the
 * URL keeps it, Finance sees what it needs to reconcile, "Send refund via
 * Razorpay" exists only for a refund waiting for review and needs a real
 * reason, and the retired "Mark refunded" is nowhere. The venue's view and
 * proofs are rented-items-proof.test.tsx.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FinanceRentalBookings } from '@duncit/venue-rentals';
import { renderWithProviders } from '../testkit';
import { notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import {
  RENTAL_TEST_LINKS,
  makeRentalDetail,
  makeRentalRow,
  rentalDetailErrorMock,
  rentalDetailMock,
  openFirstRentalRow as openFirstRow,
  rentalDrawer as drawer,
  sendRentalRefundMock,
} from '../mocks/rental-bookings.mock';

const mountFinance = (mocks: readonly MockedResponse[], initialEntries?: string[]) =>
  renderWithProviders(<FinanceRentalBookings links={RENTAL_TEST_LINKS} />, { mocks, initialEntries });

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  tableControls.rows = [makeRentalRow()];
});

describe('Finance rental board', () => {
  it('has no way to mark a refund paid by hand, only a way to open the rental', async () => {
    mountFinance([]);
    expect(await screen.findByRole('button', { name: 'Open the rental of Racket' })).toBeInTheDocument();
    expect(screen.queryByText('Mark refunded')).toBeNull();
    expect(screen.queryByText('Record refund')).toBeNull();
    // The row reads the refund the way Razorpay carries it.
    expect(screen.getByTestId('cell-refund_state')).toHaveTextContent('Needs Finance review');
    expect(screen.getByTestId('cell-refund_outstanding')).toHaveTextContent('₹500');
  });

  it('opens the clicked rental with everything Finance needs to reconcile it', async () => {
    mountFinance([rentalDetailMock(makeRentalDetail())]);
    await openFirstRow();
    const view = await drawer();

    expect(view.getByText('riya@duncit.com')).toBeInTheDocument();
    expect(view.getByText('desk@courtnine.in')).toBeInTheDocument();
    expect(view.getByRole('link', { name: '+91 9800000000' })).toHaveAttribute('href', 'tel:+919800000000');
    expect(view.getByTestId('rental-detail-guest-profile')).toHaveAttribute('href', 'https://admin.test/users/u1');
    expect(view.getByTestId('rental-detail-open-pod')).toHaveAttribute(
      'href',
      'https://mweb.test/club/pune-badminton/pod/sunday-smash',
    );
    expect(view.getByTestId('rental-detail-payment')).toHaveTextContent('pay_RZP777');
    const attempt = view.getByTestId('rental-detail-refund-attempt');
    expect(attempt).toHaveTextContent('Reconciliation required');
    expect(attempt).toHaveTextContent('BAD_REQUEST_ERROR: refund amount exceeds');
    expect(view.getByTestId('rental-detail-review-reason')).toHaveTextContent('Razorpay refused the refund three times');
    expect(view.getByText('Refunded by Duncit through Razorpay')).toBeInTheDocument();
    expect(view.getAllByTestId('rental-detail-event')).toHaveLength(2);
    expect(view.getByText('Refund held for Finance review')).toBeInTheDocument();
  });

  it('opens the rental named in the URL, so a reload or a shared link lands on it', async () => {
    mountFinance([rentalDetailMock(makeRentalDetail())], ['/rented-items?rental=rb1']);
    const view = await drawer();
    expect(view.getByTestId('rental-detail-summary')).toHaveTextContent('rb1');
    fireEvent.click(view.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Rental: Racket' })).toBeNull());
  });

  it('says the rental could not load and loads it again on Retry', async () => {
    mountFinance([rentalDetailErrorMock('rb1', 'That rental could not be found'), rentalDetailMock(makeRentalDetail())], [
      '/?rental=rb1',
    ]);
    const error = await screen.findByTestId('rental-detail-error');
    expect(error).toHaveTextContent('The rental could not load');
    expect(error).toHaveTextContent('That rental could not be found');
    fireEvent.click(within(error).getByRole('button', { name: 'Retry' }));
    expect((await drawer()).getByTestId('rental-detail-body')).toBeInTheDocument();
  });
});

describe('Send refund via Razorpay', () => {
  it('refuses a short reason, then sends through Razorpay and repaints the refund', async () => {
    const note = 'Checked the Razorpay dashboard, nothing was refunded';
    const sent = makeRentalDetail({}, { refund_state: 'PROCESSING', refund_pending: 500, refund_review_reason: '' });
    mountFinance([rentalDetailMock(makeRentalDetail()), sendRentalRefundMock('rb1', note, sent)]);
    await openFirstRow();
    fireEvent.click((await drawer()).getByRole('button', { name: 'Send refund via Razorpay' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Send the refund for Racket' }));
    expect(dialog.getByTestId('send-refund-body')).toHaveTextContent('Razorpay will refund ₹500 to Riya Sharma');
    fireEvent.change(dialog.getByLabelText('Why it is being sent'), { target: { value: 'too short' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send through Razorpay' }));
    expect(await dialog.findByText('Write at least 10 characters')).toBeInTheDocument();

    fireEvent.change(dialog.getByLabelText('Why it is being sent'), { target: { value: note } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send through Razorpay' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Refund sent to Razorpay'));
    const view = await drawer();
    await waitFor(() => expect(view.getAllByTestId('rental-refund-state')[0]).toHaveTextContent('Refund processing on Razorpay'));
    expect(view.queryByRole('button', { name: 'Send refund via Razorpay' })).toBeNull();
  });

  it('shows the server refusal in the dialog and keeps it open', async () => {
    const note = 'Razorpay shows no refund for this rental';
    mountFinance([
      rentalDetailMock(makeRentalDetail()),
      sendRentalRefundMock('rb1', note, { fail: 'This rental has no refund waiting for review' }),
    ]);
    await openFirstRow();
    fireEvent.click((await drawer()).getByRole('button', { name: 'Send refund via Razorpay' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Send the refund for Racket' }));
    fireEvent.change(dialog.getByLabelText('Why it is being sent'), { target: { value: note } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send through Razorpay' }));
    expect(await dialog.findByTestId('send-refund-error')).toHaveTextContent('This rental has no refund waiting for review');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('is not offered while Razorpay is still working on the refund', async () => {
    mountFinance([rentalDetailMock(makeRentalDetail({}, { refund_state: 'PROCESSING' }))]);
    await openFirstRow();
    const view = await drawer();
    expect(view.getByTestId('rental-refund-state')).toHaveTextContent('Refund processing on Razorpay');
    expect(view.queryByRole('button', { name: 'Send refund via Razorpay' })).toBeNull();
  });
});
