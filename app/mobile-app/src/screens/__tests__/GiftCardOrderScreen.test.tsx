import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { GiftCardOrderScreen } from '@/screens/GiftCardOrderScreen';
import { GiftCardOrdersList } from '@/components/gift-cards/GiftCardOrdersList';
import { fallbackT } from '@/i18n/fallback';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { orderNo: 'GC-ABCDEFGH23' } }),
}));

const mockRequest = graphqlRequest as jest.Mock;

const order = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  order_no: 'GC-ABCDEFGH23',
  delivery_mode: 'PHYSICAL',
  design_name: 'Classic',
  design_front_url: 'https://img/f.png',
  design_back_url: 'https://img/b.png',
  amount: 500,
  quantity: 2,
  cards_value: 1000,
  shipping_fee: 99,
  total: 1099,
  currency_symbol: '₹',
  recipient_email: '',
  payment_status: 'PAID',
  fulfilment_status: 'SHIPPED',
  created_at: '2026-11-20T09:55:00.000Z',
  shipping_address: {
    name: 'Priya Nair',
    line1: '12 MG Road',
    line2: '',
    landmark: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  },
  shipment: { courier_name: 'Delhivery', awb: 'AWB123', etd: '25 Nov' },
  tracking_events: [
    { status: 'Picked up', location: 'Bengaluru', note: '', at: '2026-11-21T10:00:00.000Z' },
    { status: 'In transit', location: 'Hub', note: 'Sorted', at: '2026-11-22T10:00:00.000Z' },
  ],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('GiftCardOrderScreen', () => {
  it('shows a printed order on its way: status, money, courier and scans newest first', async () => {
    mockRequest.mockResolvedValue({ myGiftCardOrder: order() });
    renderWithProviders(<GiftCardOrderScreen />);
    expect(await screen.findByTestId('gift-card-order-status')).toHaveTextContent(
      fallbackT('mweb.giftCards.orderStatusShipped'),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { order_no: 'GC-ABCDEFGH23' },
      { auth: true },
    );
    expect(screen.getByTestId('gift-card-order-total-value')).toHaveTextContent('₹1099.00');
    expect(screen.getByTestId('gift-card-order-awb-value')).toHaveTextContent('AWB123');
    const scans = screen.getAllByTestId('gift-card-order-scan');
    expect(scans[0]).toHaveTextContent('In transit', { exact: false });
    expect(scans[1]).toHaveTextContent('Picked up', { exact: false });
    expect(screen.getByTestId('gift-card-order-live')).toBeOnTheScreen();
  });

  it('re-reads a live order and stops once it is delivered', async () => {
    jest.useFakeTimers();
    mockRequest
      .mockResolvedValueOnce({ myGiftCardOrder: order() })
      .mockResolvedValue({ myGiftCardOrder: order({ fulfilment_status: 'DELIVERED' }) });
    renderWithProviders(<GiftCardOrderScreen />);
    await waitFor(() => expect(screen.getByTestId('gift-card-order-live')).toBeOnTheScreen());
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(screen.queryByTestId('gift-card-order-live')).toBeNull());
    const reads = mockRequest.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockRequest.mock.calls.length).toBe(reads);
  });

  it('shows an emailed order without tracking, and a printed one not shipped yet', async () => {
    mockRequest.mockResolvedValue({
      myGiftCardOrder: order({
        delivery_mode: 'DIGITAL',
        fulfilment_status: 'DELIVERED',
        shipping_fee: 0,
        shipping_address: null,
        shipment: null,
        recipient_email: 'friend@x.com',
      }),
    });
    renderWithProviders(<GiftCardOrderScreen />);
    expect(await screen.findByTestId('gift-card-order-sent-to-value')).toHaveTextContent(
      'friend@x.com',
    );
    expect(screen.queryByTestId('gift-card-order-tracking')).toBeNull();
    expect(screen.queryByTestId('gift-card-order-fee')).toBeNull();
  });

  it('says the cards are being printed before they ship', async () => {
    mockRequest.mockResolvedValue({
      myGiftCardOrder: order({
        fulfilment_status: 'PROCESSING',
        shipment: null,
        tracking_events: [],
      }),
    });
    renderWithProviders(<GiftCardOrderScreen />);
    expect(await screen.findByTestId('gift-card-order-not-shipped')).toBeOnTheScreen();
  });

  it('shows the spinner, then a not-found message when the order cannot be read', async () => {
    mockRequest.mockRejectedValue(new Error('NOT_FOUND'));
    renderWithProviders(<GiftCardOrderScreen />);
    expect(screen.getByTestId('gift-card-order-loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('gift-card-order-error')).toHaveTextContent(
      fallbackT('mweb.giftCards.orderNotFound'),
    );
  });
});

describe('GiftCardOrdersList', () => {
  it('lists orders newest first and opens one', async () => {
    mockRequest.mockResolvedValue({
      myGiftCardOrders: {
        total: 2,
        rows: [
          order(),
          order({
            id: 'o2',
            order_no: 'GC-DIGITAL222',
            delivery_mode: 'DIGITAL',
            design_front_url: '',
            payment_status: 'PENDING',
          }),
        ],
      },
    });
    const onOpen = jest.fn();
    renderWithProviders(<GiftCardOrdersList onOpen={onOpen} />);
    expect(await screen.findByTestId('gift-card-order-GC-ABCDEFGH23')).toHaveTextContent(
      '₹1099.00',
      { exact: false },
    );
    expect(screen.getByTestId('gift-card-order-GC-DIGITAL222')).toHaveTextContent(
      fallbackT('mweb.giftCards.paymentPending'),
      { exact: false },
    );
    fireEvent.press(screen.getByTestId('gift-card-order-GC-ABCDEFGH23'));
    expect(onOpen).toHaveBeenCalledWith('GC-ABCDEFGH23');
  });

  it('shows the empty state, and a failure', async () => {
    mockRequest.mockResolvedValueOnce({ myGiftCardOrders: { total: 0, rows: [] } });
    const first = renderWithProviders(<GiftCardOrdersList onOpen={jest.fn()} />);
    expect(await screen.findByTestId('gift-card-orders-empty')).toBeOnTheScreen();
    first.unmount();
    mockRequest.mockRejectedValueOnce(new Error('down'));
    renderWithProviders(<GiftCardOrdersList onOpen={jest.fn()} />);
    expect(await screen.findByTestId('gift-card-orders-error')).toBeOnTheScreen();
  });
});
