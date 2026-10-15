import { fireEvent, screen } from '@testing-library/react-native';
import { formatFoodMoney, type MyVenueFoodOrder } from '@duncit/utils';

import { FoodOrdersSection } from '@/components/venue-food-orders/FoodOrdersSection';
import type { MyFoodOrders } from '@/hooks/useMyFoodOrders';
import { renderWithProviders } from '@/utils/test-utils';

// The admin's date format is its own hook's concern; here a date reads back as it was given.
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDate: (iso: string) => `day ${iso.slice(0, 10)}` }),
}));

const order = (id: string, over: Partial<MyVenueFoodOrder> = {}): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'v1',
  venue_name: 'Sunset Cafe',
  total: 216,
  currency_symbol: '₹',
  status: 'PREPARING',
  payment_status: 'PAID',
  created_at: '2026-10-13T10:00:00.000Z',
  items: [
    { name: 'Masala Chai', quantity: 2 },
    { name: 'Samosa', quantity: 1 },
  ],
  ...over,
});

const listOf = (over: Partial<MyFoodOrders> = {}): MyFoodOrders => ({
  rows: [],
  keys: [],
  loading: false,
  failed: false,
  hasMore: false,
  loadMore: jest.fn(() => Promise.resolve()),
  loadingMore: false,
  moreFailed: false,
  reload: jest.fn(() => Promise.resolve()),
  ...over,
});

const onOpen = jest.fn();

function renderSection(orders: MyFoodOrders) {
  return renderWithProviders(
    <FoodOrdersSection
      testID="section"
      title="Current Orders"
      emptyTitle="Nothing cooking"
      emptyIcon="restaurant"
      orders={orders}
      onOpen={onOpen}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('FoodOrdersSection states', () => {
  it('heads the section and spins while the first page loads', () => {
    renderSection(listOf({ loading: true }));
    expect(screen.getByTestId('section-header')).toHaveTextContent(/Current Orders/);
    expect(screen.getByTestId('section-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('section-empty')).toBeNull();
  });

  it('says the section is empty in its own words', () => {
    renderSection(listOf());
    expect(screen.getByTestId('section-empty-title')).toHaveTextContent('Nothing cooking');
    expect(screen.queryByTestId('section-more')).toBeNull();
  });

  it('says the orders could not be loaded and tries again on request', () => {
    const orders = listOf({ failed: true, hasMore: true });
    renderSection(orders);
    expect(screen.getByTestId('section-failed-title')).toHaveTextContent(
      'Your food orders could not be loaded.',
    );
    // A failed list offers no "Show more" for pages it never had.
    expect(screen.queryByTestId('section-more')).toBeNull();
    fireEvent.press(screen.getByText('Try again'));
    expect(orders.reload).toHaveBeenCalledTimes(1);
  });

  it('offers the next page while the server holds more, and asks for it', () => {
    const orders = listOf({ rows: [order('o1')], hasMore: true });
    renderSection(orders);
    const more = screen.getByTestId('section-more');
    expect(more).toHaveTextContent('Show more');
    expect(more.props['aria-busy']).toBe(false);
    fireEvent.press(more);
    expect(orders.loadMore).toHaveBeenCalledTimes(1);
  });

  it('shows the next page on its way, and says when it failed', () => {
    const { rerender } = renderSection(
      listOf({ rows: [order('o1')], hasMore: true, loadingMore: true }),
    );
    expect(screen.getByTestId('section-more').props['aria-busy']).toBe(true);
    expect(screen.queryByTestId('section-more-failed')).toBeNull();

    rerender(
      <FoodOrdersSection
        testID="section"
        title="Current Orders"
        emptyTitle="Nothing cooking"
        emptyIcon="restaurant"
        orders={listOf({ rows: [order('o1')], hasMore: true, moreFailed: true })}
        onOpen={onOpen}
      />,
    );
    const alert = screen.getByTestId('section-more-failed');
    expect(alert).toHaveTextContent('Your food orders could not be loaded.');
    expect(alert.props.role).toBe('alert');
    expect(screen.getByTestId('section-list')).toBeOnTheScreen();
  });
});

describe('FoodOrderRow', () => {
  it('shows which order, where, its dishes, when and what it came to', () => {
    renderSection(listOf({ rows: [order('o1')] }));
    const row = screen.getByTestId('food-orders-row-o1');
    expect(row).toHaveTextContent(/Order F-o1/);
    expect(row).toHaveTextContent(/Sunset Cafe/);
    expect(row).toHaveTextContent(/2 × Masala Chai, 1 × Samosa/);
    expect(row).toHaveTextContent(
      new RegExp(`Placed on day 2026-10-13 · Total ${formatFoodMoney(216, '₹')}`),
    );
    expect(screen.getByTestId('food-orders-status-o1')).toHaveTextContent('Preparing');
  });

  it('shows an unpaid order as awaiting payment, whatever the kitchen status', () => {
    renderSection(listOf({ rows: [order('o1', { payment_status: 'PENDING', status: 'PLACED' })] }));
    expect(screen.getByTestId('food-orders-status-o1')).toHaveTextContent('Payment pending');
  });

  it('opens an order with the key this device kept for it, or none for the account’s own', () => {
    renderSection(
      listOf({
        rows: [order('o1'), order('o2', { status: 'SERVED' })],
        keys: [{ order_id: 'o1', access_key: 'ak1' }],
      }),
    );
    const open = screen.getByTestId('food-orders-open-o1');
    expect(open).toHaveTextContent(/View details/);
    // Starts with the visible label, then names the order.
    expect(open.props['aria-label']).toBe('View details of order #F-o1');
    fireEvent.press(open);
    expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'o1' }), 'ak1');

    expect(screen.getByTestId('food-orders-status-o2')).toHaveTextContent('Served');
    fireEvent.press(screen.getByTestId('food-orders-open-o2'));
    expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'o2' }), null);
  });
});
