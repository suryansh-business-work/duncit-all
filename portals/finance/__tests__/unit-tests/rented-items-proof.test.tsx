/**
 * Rented items › the venue's view of a rental and the optional proof, on the
 * REAL @duncit/venue-rentals desk: the venue never sees the guest's email, the
 * payment, the Razorpay ids or the refund action; a proof needs a note or a
 * photo and takes at most six photos.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FinanceRentalBookings, VenueRentalBookings } from '@duncit/venue-rentals';
import { renderWithProviders } from '../testkit';
import { notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import {
  RENTAL_TEST_LINKS,
  addRentalProofMock,
  makeRentalDetail,
  makeRentalRow,
  makeVenueRentalDetail,
  openFirstRentalRow as openFirstRow,
  rentalDetailMock,
  rentalDrawer as drawer,
} from '../mocks/rental-bookings.mock';

const mountFinance = (mocks: readonly MockedResponse[]) =>
  renderWithProviders(<FinanceRentalBookings links={RENTAL_TEST_LINKS} />, { mocks });

const mountVenue = (mocks: readonly MockedResponse[]) =>
  renderWithProviders(<VenueRentalBookings venueId="v1" surface="partners-app" links={RENTAL_TEST_LINKS} />, { mocks });

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  tableControls.rows = [makeRentalRow()];
});

describe('The venue’s view of a rental', () => {
  it('hides the emails, payment, Razorpay ids, profile link and the refund action', async () => {
    tableControls.rows = [makeRentalRow({ venue_id: 'v1' })];
    mountVenue([rentalDetailMock(makeVenueRentalDetail())]);
    await openFirstRow();
    const view = await drawer();

    expect(view.getByText('Riya Sharma')).toBeInTheDocument();
    expect(view.getByRole('link', { name: '+91 9800000000' })).toBeInTheDocument();
    expect(view.queryByText('riya@duncit.com')).toBeNull();
    expect(view.queryByText('Email')).toBeNull();
    expect(view.queryByTestId('rental-detail-payment')).toBeNull();
    expect(view.queryByTestId('rental-detail-guest-profile')).toBeNull();
    const attempt = view.getByTestId('rental-detail-refund-attempt');
    expect(attempt).not.toHaveTextContent('Attempts');
    expect(attempt).not.toHaveTextContent('Razorpay refund');
    expect(view.queryByRole('button', { name: 'Send refund via Razorpay' })).toBeNull();
    // The pod link is the venue's too: it is not private.
    expect(view.getByTestId('rental-detail-open-pod')).toBeInTheDocument();
  });

  it('keeps Mark for an item still out, beside Open', async () => {
    tableControls.rows = [makeRentalRow({ status: 'BOOKED', refund_state: 'AWAITING_RETURN' })];
    mountVenue([]);
    expect(await screen.findByRole('button', { name: 'Mark Racket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the rental of Racket' })).toBeInTheDocument();
  });
});

describe('Add proof', () => {
  it('refuses an empty proof, stops at six photos, then saves and lists the proof', async () => {
    const saved = makeRentalDetail({
      proofs: [
        {
          note: 'Strings frayed',
          image_urls: ['https://ik.imagekit.io/duncit/proof-x.jpg'],
          added_by_name: 'Asha Rao',
          added_by_role: 'FINANCE',
          added_at: '2026-11-22T09:00:00.000Z',
          __typename: 'RentalProof',
        } as never,
      ],
    });
    mountFinance([
      rentalDetailMock(makeRentalDetail()),
      addRentalProofMock('rb1', { note: 'Strings frayed', image_urls: [] }, saved),
    ]);
    await openFirstRow();
    const view = await drawer();
    expect(view.getByText('No proof added')).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Add proof' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Add proof for Racket' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save proof' }));
    expect(await dialog.findByText('Add a note or at least one photo')).toBeInTheDocument();

    const addPhoto = dialog.getByRole('button', { name: 'Add photo of Racket' });
    for (let n = 0; n < 6; n += 1) {
      fireEvent.click(addPhoto);
      fireEvent.click(await screen.findByRole('button', { name: 'pick photo' }));
    }
    expect(dialog.getAllByRole('img')).toHaveLength(6);
    expect(addPhoto).toBeDisabled();
    // Back to a note alone: remove the photos one by one.
    for (let n = 6; n >= 1; n -= 1) {
      fireEvent.click(dialog.getByRole('button', { name: `Remove photo ${n} of Racket` }));
    }

    fireEvent.change(dialog.getByLabelText('Note'), { target: { value: '  Strings frayed  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save proof' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Proof added'));
    expect(await view.findByText('Strings frayed')).toBeInTheDocument();

    fireEvent.click(view.getByRole('button', { name: 'Proof photo 1.1' }));
    const lightbox = within(await screen.findByRole('dialog', { name: 'Proof photo 1.1' }));
    expect(lightbox.getByRole('img', { name: 'Proof photo 1.1' })).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/proof-x.jpg');
    fireEvent.click(lightbox.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Proof photo 1.1' })).toBeNull());
  });
});
