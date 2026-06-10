import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutSuccess, OrderSummary } from '@/components/checkout';
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
  });
});
