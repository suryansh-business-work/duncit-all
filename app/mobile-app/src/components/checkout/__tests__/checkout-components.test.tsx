import { Modal } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutSuccess, OrderSummary, VenueChargesSheet } from '@/components/checkout';
import { renderWithProviders } from '@/utils/test-utils';
import type { CheckoutBreakup } from '@/utils/checkout-math';

const breakup: CheckoutBreakup = {
  subtotal: 100,
  fee: 10,
  gst: 20,
  total: 130,
  currency: '₹',
  feePct: 10,
  gstPct: 18,
};

describe('OrderSummary', () => {
  it('renders the pod + the inclusive breakup', () => {
    renderWithProviders(
      <OrderSummary
        pod={
          {
            id: 'p1',
            pod_title: 'Sunset Pod',
            pod_date_time: '2026-06-10T10:00:00Z',
            zone_name: 'Kothrud',
            pod_images_and_videos: [{ url: 'http://i', type: 'IMAGE' }],
          } as never
        }
        breakup={breakup}
      />,
    );
    expect(screen.getByText('Sunset Pod')).toBeOnTheScreen();
    expect(screen.getByText('₹130.00')).toBeOnTheScreen();
    expect(screen.getByText('Platform fee (10%)')).toBeOnTheScreen();
  });

  it('tolerates a pod with no image/date', () => {
    renderWithProviders(
      <OrderSummary
        pod={{ id: 'p1', pod_title: 'Bare', pod_images_and_videos: [] } as never}
        breakup={breakup}
      />,
    );
    expect(screen.getByText('Bare')).toBeOnTheScreen();
    // No place_charges → the venue-charges row is hidden.
    expect(screen.queryByTestId('venue-charges-row')).toBeNull();
  });

  it('shows venue charges (pay at venue), sums them, and opens/closes the info sheet', () => {
    renderWithProviders(
      <OrderSummary
        pod={
          {
            id: 'p1',
            pod_title: 'Sunset Pod',
            pod_images_and_videos: [],
            place_charges: [
              { label: 'Entry fee', amount: 100, note: 'Paid at the gate' },
              { label: 'Table charge', amount: 50, note: null },
            ],
          } as never
        }
        breakup={breakup}
      />,
    );
    // The venue line is shown separately, marked pay-at-venue (NOT in Total payable).
    expect(screen.getByTestId('venue-charges-row')).toBeOnTheScreen();
    expect(screen.getByText('Payable directly at the venue')).toBeOnTheScreen();
    // 100 + 50 = ₹150.00 — appears once (the row) while the sheet is closed.
    expect(screen.getByText('₹150.00')).toBeOnTheScreen();
    // Info icon opens the explainer sheet with the spec copy + itemisation.
    fireEvent.press(screen.getByTestId('venue-charges-info'));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
    expect(
      screen.getByText('Optional venue-side charges to be paid to the Venue.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Entry fee')).toBeOnTheScreen();
    expect(screen.getByText('Paid at the gate')).toBeOnTheScreen();
    expect(screen.getByText('Table charge')).toBeOnTheScreen();
    expect(screen.getByText('Total venue charges')).toBeOnTheScreen();
    // The summed total now shows in both the row and the sheet; per-charge ₹50 is unique.
    expect(screen.getAllByText('₹150.00')).toHaveLength(2);
    expect(screen.getByText('₹50.00')).toBeOnTheScreen();
    // Close button dismisses the sheet (Modal flips back to hidden).
    fireEvent.press(screen.getByTestId('venue-charges-sheet-close'));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });
});

describe('VenueChargesSheet', () => {
  const charges = [
    { label: 'Entry fee', amount: 100, note: 'Paid at the gate' },
    { label: 'Table charge', amount: 50, note: null },
  ];

  it('dismisses via both the close button and the backdrop', () => {
    const onClose = jest.fn();
    const { rerender } = renderWithProviders(
      <VenueChargesSheet open charges={charges} currency="₹" onClose={onClose} />,
    );
    fireEvent.press(screen.getByTestId('venue-charges-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<VenueChargesSheet open charges={charges} currency="₹" onClose={onClose} />);
    fireEvent.press(screen.getByTestId('venue-charges-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('CheckoutSuccess', () => {
  const payment = {
    id: 'pay1',
    invoice_no: 'INV-1',
    total: 130,
    currency_symbol: '₹',
    status: 'SUCCESS',
    paid_at: '2026-06-06T10:00:00Z',
    created_at: '2026-06-06T10:00:00Z',
  } as never;

  it('shows the receipt and fires navigation', () => {
    const onHome = jest.fn();
    const onProfile = jest.fn();
    renderWithProviders(
      <CheckoutSuccess
        payment={payment}
        onDownloadInvoice={jest.fn().mockResolvedValue(undefined)}
        onHome={onHome}
        onProfile={onProfile}
      />,
    );
    expect(screen.getByText('Payment successful')).toBeOnTheScreen();
    expect(screen.getByText('₹130.00')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('success-home'));
    fireEvent.press(screen.getByTestId('success-profile'));
    expect(onHome).toHaveBeenCalled();
    expect(onProfile).toHaveBeenCalled();
  });

  it('downloads the invoice and surfaces a failure', async () => {
    const onDownloadInvoice = jest.fn().mockRejectedValueOnce(new Error('no invoice'));
    renderWithProviders(
      <CheckoutSuccess
        payment={payment}
        onDownloadInvoice={onDownloadInvoice}
        onHome={jest.fn()}
        onProfile={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('download-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('invoice-error')).toHaveTextContent('no invoice'),
    );
  });

  it('downloads the ticket when provided and surfaces a failure', async () => {
    const onDownloadTicket = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('no ticket'));
    renderWithProviders(
      <CheckoutSuccess
        payment={payment}
        onDownloadInvoice={jest.fn().mockResolvedValue(undefined)}
        onDownloadTicket={onDownloadTicket}
        onHome={jest.fn()}
        onProfile={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('download-ticket'));
    await waitFor(() => expect(onDownloadTicket).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('download-ticket'));
    await waitFor(() => expect(screen.getByTestId('invoice-error')).toHaveTextContent('no ticket'));
  });

  it('hides the ticket button when no ticket handler is given', () => {
    renderWithProviders(
      <CheckoutSuccess
        payment={payment}
        onDownloadInvoice={jest.fn()}
        onHome={jest.fn()}
        onProfile={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('download-ticket')).toBeNull();
    // No pod / place_charges → the pay-at-venue reminder is hidden.
    expect(screen.queryByTestId('success-venue-note')).toBeNull();
  });

  it('reminds the buyer about venue charges payable at the venue', () => {
    renderWithProviders(
      <CheckoutSuccess
        payment={payment}
        pod={
          {
            id: 'p1',
            pod_title: 'Sunset Pod',
            place_charges: [
              { label: 'Entry fee', amount: 100, note: null },
              { label: 'Table charge', amount: 50, note: null },
            ],
          } as never
        }
        onDownloadInvoice={jest.fn()}
        onHome={jest.fn()}
        onProfile={jest.fn()}
      />,
    );
    expect(screen.getByTestId('success-venue-note')).toBeOnTheScreen();
    // ₹150.00 (100 + 50) is unique here — the receipt total is ₹130.00.
    expect(
      screen.getByText(/Venue charges ₹150\.00 are payable directly at\s+the venue\./),
    ).toBeOnTheScreen();
  });
});
