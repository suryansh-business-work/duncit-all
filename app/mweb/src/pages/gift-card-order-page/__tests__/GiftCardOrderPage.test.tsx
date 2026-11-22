import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import GiftCardOrderPage from '..';
import OrdersTab from '../../gift-cards-page/OrdersTab';
import { fallbackT } from '../../../i18n/fallback';
import type { GiftCardOrder } from '../queries';

const h = vi.hoisted(() => ({ useQuery: vi.fn(), startPolling: vi.fn(), stopPolling: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDate: (d: string) => `day:${d}`, formatDateTime: (d: string) => `at:${d}` }),
}));

const order = (over: Partial<GiftCardOrder> = {}): GiftCardOrder => ({
  id: 'o1',
  order_no: 'GC-ABCDEFGH23',
  delivery_mode: 'PHYSICAL',
  design_name: 'Classic',
  design_front_url: 'https://img/front.png',
  design_back_url: 'https://img/back.png',
  amount: 500,
  quantity: 2,
  cards_value: 1000,
  shipping_fee: 99,
  total: 1099,
  currency_symbol: '₹',
  recipient_name: 'Priya',
  recipient_email: '',
  message: '',
  shipping_address: { name: 'Priya Nair', phone: '9876543210', line1: '12 MG Road', line2: '', landmark: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', country: 'India' },
  payment_status: 'PAID',
  fulfilment_status: 'SHIPPED',
  cards_issued: 2,
  paid_at: '2026-11-20T10:00:00.000Z',
  delivered_at: null,
  created_at: '2026-11-20T09:55:00.000Z',
  shipment: { courier_name: 'Delhivery', awb: 'AWB123', tracking_status: 'IN TRANSIT', etd: '25 Nov', pickup_scheduled_date: '', last_synced_at: null },
  tracking_events: [
    { status: 'Picked up', location: 'Bengaluru', note: '', at: '2026-11-21T10:00:00.000Z' },
    { status: 'In transit', location: 'Hub', note: 'Sorted', at: '2026-11-22T10:00:00.000Z' },
  ],
  ...over,
});

const answer = (state: { data?: object; loading?: boolean; error?: boolean }) =>
  h.useQuery.mockReturnValue({
    data: state.data,
    loading: state.loading ?? false,
    error: state.error ? new Error('x') : undefined,
    startPolling: h.startPolling,
    stopPolling: h.stopPolling,
  });

const Where = () => {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
};

const page = (orderNo = 'GC-ABCDEFGH23') =>
  render(
    <MemoryRouter initialEntries={[`/gift-cards/orders/${orderNo}`]}>
      <Routes>
        <Route path="/gift-cards/orders/:orderNo" element={<GiftCardOrderPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => vi.clearAllMocks());

describe('GiftCardOrderPage', () => {
  it('shows a printed order on its way: status, progress, money, courier and scans newest first', () => {
    answer({ data: { myGiftCardOrder: order() } });
    page();
    expect(screen.getByTestId('gift-card-order-status')).toHaveTextContent(fallbackT('mweb.giftCards.orderStatusShipped'));
    expect(screen.getByTestId('gift-card-order-fee')).toHaveTextContent('₹99');
    expect(screen.getByTestId('gift-card-order-total')).toHaveTextContent('₹1,099');
    expect(screen.getByTestId('gift-card-order-awb')).toHaveTextContent('AWB123');
    expect(screen.getByTestId('gift-card-order-etd')).toHaveTextContent('25 Nov');
    const scans = within(screen.getByTestId('gift-card-order-scans')).getAllByRole('listitem');
    expect(scans[0]).toHaveTextContent('In transit');
    expect(scans[1]).toHaveTextContent('Picked up');
    expect(screen.getByTestId('gift-card-order-live')).toBeInTheDocument();
    expect(h.startPolling).toHaveBeenCalledWith(30_000);
  });

  it('stops re-reading a delivered order, and shows where an emailed one was sent', () => {
    answer({
      data: {
        myGiftCardOrder: order({ delivery_mode: 'DIGITAL', fulfilment_status: 'DELIVERED', shipping_fee: 0, shipping_address: null, shipment: null, recipient_email: 'friend@x.com' }),
      },
    });
    page();
    expect(h.startPolling).not.toHaveBeenCalled();
    expect(h.stopPolling).toHaveBeenCalled();
    expect(screen.queryByTestId('gift-card-order-live')).toBeNull();
    expect(screen.queryByTestId('gift-card-order-fee')).toBeNull();
    expect(screen.queryByTestId('gift-card-order-tracking')).toBeNull();
    expect(screen.getByTestId('gift-card-order-sent-to')).toHaveTextContent('friend@x.com');
  });

  it('says a paid printed order has not shipped yet', () => {
    answer({ data: { myGiftCardOrder: order({ fulfilment_status: 'PROCESSING', shipment: null, tracking_events: [] }) } });
    page();
    expect(screen.getByTestId('gift-card-order-not-shipped')).toBeInTheDocument();
    expect(screen.queryByTestId('gift-card-order-scans')).toBeNull();
  });

  it('shows the loader, then a not-found message, and goes back to the orders tab', () => {
    answer({ loading: true });
    const { unmount } = page();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();
    answer({ error: true });
    page();
    expect(screen.getByTestId('gift-card-order-error')).toHaveTextContent(fallbackT('mweb.giftCards.orderNotFound'));
    fireEvent.click(screen.getByTestId('gift-card-order-header-back'));
    expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards?selectedtab=orders');
  });
});

describe('OrdersTab', () => {
  const tab = () =>
    render(
      <MemoryRouter initialEntries={['/gift-cards']}>
        <Routes>
          <Route path="/gift-cards" element={<OrdersTab />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );

  it('lists the member’s orders and opens one', () => {
    answer({ data: { myGiftCardOrders: { rows: [order(), order({ id: 'o2', order_no: 'GC-DIGITAL222', delivery_mode: 'DIGITAL', design_front_url: '', payment_status: 'PENDING' })], total: 2 } } });
    tab();
    const printed = screen.getByTestId('gift-card-order-GC-ABCDEFGH23');
    expect(printed).toHaveTextContent('₹1,099');
    expect(within(screen.getByTestId('gift-card-order-GC-DIGITAL222')).getByText(fallbackT('mweb.giftCards.paymentPending'))).toBeInTheDocument();
    fireEvent.click(within(printed).getByRole('button'));
    expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/orders/GC-ABCDEFGH23');
  });

  it('shows the loader, the empty state and a load failure', () => {
    answer({ loading: true });
    const first = tab();
    expect(screen.getByTestId('gift-card-orders-loading')).toBeInTheDocument();
    first.unmount();
    answer({ data: { myGiftCardOrders: { rows: [], total: 0 } } });
    const second = tab();
    expect(screen.getByTestId('gift-card-orders-empty')).toBeInTheDocument();
    second.unmount();
    answer({ error: true });
    tab();
    expect(screen.getByText(fallbackT('mweb.giftCards.ordersLoadError'))).toBeInTheDocument();
  });
});
