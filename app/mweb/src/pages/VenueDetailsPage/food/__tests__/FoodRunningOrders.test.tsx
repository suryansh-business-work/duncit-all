import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import type { MyVenueFoodOrder, MyVenueFoodOrdersInput } from '@duncit/utils';
import FoodRunningOrders from '../FoodRunningOrders';
import { saveFoodOrder } from '../foodStorage';
import { MY_VENUE_FOOD_ORDERS } from '../queries';

const order = (id: string, over: Partial<MyVenueFoodOrder> = {}): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'v1',
  venue_name: 'Grand Hall',
  total: 120,
  currency_symbol: '₹',
  status: 'PREPARING',
  payment_status: 'PAID',
  created_at: '2026-10-15T10:00:00.000Z',
  items: [{ name: 'Masala Chai', quantity: 2 }],
  ...over,
});

function ordersMock(asked: MyVenueFoodOrdersInput[], rows: MyVenueFoodOrder[] | Error): MockedResponse {
  const request = {
    query: MY_VENUE_FOOD_ORDERS,
    variables: (vars: { input: MyVenueFoodOrdersInput }) => {
      asked.push(vars.input);
      return true;
    },
  };
  return rows instanceof Error
    ? { request, error: rows }
    : { request, result: { data: { myVenueFoodOrders: { rows, total: rows.length, page: 1, page_size: 20 } } } };
}

const renderRunning = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <FoodRunningOrders venueId="v1" />
      </MemoryRouter>
    </MockedProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('FoodRunningOrders', () => {
  it('asks the server for this venue’s CURRENT orders, sending the keys this browser kept', async () => {
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: 'F-o1', access_key: 'k1', client_key: '' });
    const asked: MyVenueFoodOrdersInput[] = [];
    renderRunning([ordersMock(asked, [])]);
    await waitFor(() => expect(asked).toHaveLength(1));
    expect(asked[0]).toEqual({
      scope: 'CURRENT',
      venue_id: 'v1',
      keys: [{ order_id: 'o1', access_key: 'k1' }],
      page: 1,
      page_size: 20,
    });
  });

  it('links every running order — not only the latest — plus all of the visitor’s food orders', async () => {
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: 'F-o1', access_key: 'k1', client_key: '' });
    renderRunning([ordersMock([], [order('o1'), order('o2')])]);

    const nav = await screen.findByRole('navigation', { name: 'Current Orders' });
    expect(nav).toHaveAttribute('data-testid', 'venue-food-running-orders');
    // The order this browser placed opens with its own key; the account's opens bare.
    expect(screen.getByRole('link', { name: 'Track your order F-o1' })).toHaveAttribute(
      'href',
      '/venue/v1/food-order/o1?key=k1',
    );
    expect(screen.getByRole('link', { name: 'Track your order F-o2' })).toHaveAttribute('href', '/venue/v1/food-order/o2');
    expect(screen.getByTestId('venue-food-my-orders')).toHaveAttribute('href', '/food-orders');
    expect(screen.getByTestId('venue-food-my-orders')).toHaveTextContent('Your Food Orders');
  });

  it('shows nothing while no order is running', async () => {
    const asked: MyVenueFoodOrdersInput[] = [];
    renderRunning([ordersMock(asked, [])]);
    await waitFor(() => expect(asked).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('venue-food-running-orders')).not.toBeInTheDocument();
  });

  it('shows nothing, and logs, when the orders cannot be read — the menu is never blocked', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    renderRunning([ordersMock([], new Error('Network down'))]);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('venueFood', 'myOrders', expect.objectContaining({ scope: 'CURRENT' })),
    );
    expect(screen.queryByTestId('venue-food-running-orders')).not.toBeInTheDocument();
  });
});
