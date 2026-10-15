import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import type { MyVenueFoodOrder, MyVenueFoodOrderScope, MyVenueFoodOrdersInput } from '@duncit/utils';
import FoodOrdersPage from '..';
import { saveFoodOrder } from '../../VenueDetailsPage/food/foodStorage';
import { MY_VENUE_FOOD_ORDERS } from '../../VenueDetailsPage/food/queries';

// Dates follow the admin-configured zone; a fixed formatter keeps the rows deterministic.
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDate: (d: string) => `day:${d}` }),
}));

const order = (id: string, over: Partial<MyVenueFoodOrder> = {}): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'v1',
  venue_name: 'Grand Hall',
  total: 120,
  currency_symbol: '₹',
  status: 'PREPARING',
  payment_status: 'PAID',
  created_at: '2026-10-15',
  items: [
    { name: 'Masala Chai', quantity: 2 },
    { name: 'Samosa', quantity: 1 },
  ],
  ...over,
});

interface PageAnswer {
  rows: MyVenueFoodOrder[];
  total?: number;
  page?: number;
}

/** One answer for one scope and page; records what was asked. */
function pageMock(
  scope: MyVenueFoodOrderScope,
  page: number,
  answer: PageAnswer | Error,
  asked: MyVenueFoodOrdersInput[] = [],
): MockedResponse {
  const request = {
    query: MY_VENUE_FOOD_ORDERS,
    variables: (vars: { input: MyVenueFoodOrdersInput }) => {
      const match = vars.input.scope === scope && vars.input.page === page;
      if (match) asked.push(vars.input);
      return match;
    },
  };
  if (answer instanceof Error) return { request, error: answer };
  const pageSize = scope === 'CURRENT' ? 20 : 10;
  return {
    request,
    result: {
      data: {
        myVenueFoodOrders: { rows: answer.rows, total: answer.total ?? answer.rows.length, page: answer.page ?? page, page_size: pageSize },
      },
    },
  };
}

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={['/food-orders']}>
        <FoodOrdersPage />
      </MemoryRouter>
    </MockedProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'member-token');
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('FoodOrdersPage — the two sections', () => {
  it('shows each section loading until its orders arrive', () => {
    renderPage([pageMock('CURRENT', 1, { rows: [] }), pageMock('PAST', 1, { rows: [] })]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Food Orders');
    expect(screen.getByTestId('food-orders-current-loading')).toHaveAttribute('role', 'progressbar');
    expect(screen.getByTestId('food-orders-past-loading')).toHaveAttribute('role', 'progressbar');
  });

  it('lists current orders above past ones, each row naming the order, venue, dishes, date, total and status', async () => {
    renderPage([
      pageMock('CURRENT', 1, { rows: [order('c1')] }),
      pageMock('PAST', 1, { rows: [order('p1', { status: 'SERVED', venue_name: 'Cafe Uno', total: 75.5 })] }),
    ]);
    const current = await screen.findByRole('region', { name: 'Current Orders' });
    const past = screen.getByRole('region', { name: 'Past Food Orders' });
    expect(current.compareDocumentPosition(past) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const row = await within(current).findByTestId('food-orders-row-c1');
    expect(within(row).getByRole('heading', { level: 3 })).toHaveTextContent('Order F-c1');
    expect(row).toHaveTextContent('Grand Hall');
    expect(row).toHaveTextContent('2 × Masala Chai, 1 × Samosa');
    expect(row).toHaveTextContent('Placed on day:2026-10-15');
    expect(row).toHaveTextContent('Total ₹120');
    expect(screen.getByTestId('food-orders-status-c1')).toHaveTextContent('Preparing');

    const pastRow = await within(past).findByTestId('food-orders-row-p1');
    expect(pastRow).toHaveTextContent('Cafe Uno');
    expect(pastRow).toHaveTextContent('Total ₹75.50');
    expect(screen.getByTestId('food-orders-status-p1')).toHaveTextContent('Served');
  });

  it('says the payment is still open instead of the kitchen status', async () => {
    renderPage([
      pageMock('CURRENT', 1, { rows: [order('c1', { status: 'PLACED', payment_status: 'PENDING' })] }),
      pageMock('PAST', 1, { rows: [] }),
    ]);
    expect(await screen.findByTestId('food-orders-status-c1')).toHaveTextContent('Payment pending');
  });

  it('opens an order this browser placed with its own key, and an account’s order without one', async () => {
    saveFoodOrder({ order_id: 'c1', venue_id: 'v1', order_no: 'F-c1', access_key: 'key-1', client_key: '' });
    renderPage([pageMock('CURRENT', 1, { rows: [order('c1'), order('c2')] }), pageMock('PAST', 1, { rows: [] })]);
    const mine = await screen.findByRole('link', { name: 'View details of order #F-c1' });
    expect(mine).toHaveAttribute('href', '/venue/v1/food-order/c1?key=key-1');
    expect(screen.getByRole('link', { name: 'View details of order #F-c2' })).toHaveAttribute(
      'href',
      '/venue/v1/food-order/c2',
    );
  });

  it('sends the device’s keys with both reads, with no venue filter', async () => {
    saveFoodOrder({ order_id: 'c1', venue_id: 'v1', order_no: 'F-c1', access_key: 'key-1', client_key: '' });
    const asked: MyVenueFoodOrdersInput[] = [];
    renderPage([pageMock('CURRENT', 1, { rows: [] }, asked), pageMock('PAST', 1, { rows: [] }, asked)]);
    await waitFor(() => expect(asked).toHaveLength(2));
    const keys = [{ order_id: 'c1', access_key: 'key-1' }];
    expect(asked).toEqual(
      expect.arrayContaining([
        { scope: 'CURRENT', venue_id: null, keys, page: 1, page_size: 20 },
        { scope: 'PAST', venue_id: null, keys, page: 1, page_size: 10 },
      ]),
    );
  });

  it('shows each section’s own empty state', async () => {
    renderPage([pageMock('CURRENT', 1, { rows: [] }), pageMock('PAST', 1, { rows: [] })]);
    expect(await screen.findByTestId('food-orders-current-empty')).toHaveTextContent(
      'No food orders in progress right now.',
    );
    expect(await screen.findByTestId('food-orders-past-empty')).toHaveTextContent(
      'Your finished food orders will show here.',
    );
    expect(screen.queryByTestId('food-orders-past-more')).not.toBeInTheDocument();
  });
});

describe('FoodOrdersPage — failure and retry', () => {
  it('says the orders could not be loaded, logs it, and reads again on Try again', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    renderPage([
      pageMock('CURRENT', 1, new Error('Network down')),
      pageMock('PAST', 1, { rows: [] }),
      pageMock('CURRENT', 1, { rows: [order('c1')] }),
    ]);
    const failed = await screen.findByTestId('food-orders-current-failed');
    expect(failed).toHaveTextContent('Your food orders could not be loaded.');
    expect(warn).toHaveBeenCalledWith('venueFood', 'myOrders', expect.objectContaining({ scope: 'CURRENT' }));
    // A failed section offers no "Show more".
    expect(screen.queryByTestId('food-orders-current-more')).not.toBeInTheDocument();

    fireEvent.click(within(failed).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('food-orders-row-c1')).toBeInTheDocument();
    expect(screen.queryByTestId('food-orders-current-failed')).not.toBeInTheDocument();
  });
});

describe('FoodOrdersPage — past orders a page at a time', () => {
  const firstPage = Array.from({ length: 10 }, (_, i) => order(`p${i}`, { status: 'SERVED' }));

  it('offers "Show more" while the server holds more, appends the next page without repeating a row, then stops', async () => {
    const asked: MyVenueFoodOrdersInput[] = [];
    renderPage([
      pageMock('CURRENT', 1, { rows: [] }),
      pageMock('PAST', 1, { rows: firstPage, total: 11 }),
      // The list shifted meanwhile: p9 comes back on page 2 as well.
      pageMock('PAST', 2, { rows: [order('p9', { status: 'SERVED' }), order('p10', { status: 'SERVED' })], total: 11 }, asked),
    ]);
    const more = await screen.findByTestId('food-orders-past-more');
    expect(more).toHaveTextContent('Show more');
    fireEvent.click(more);

    expect(await screen.findByTestId('food-orders-row-p10')).toBeInTheDocument();
    expect(asked[0]).toEqual(expect.objectContaining({ scope: 'PAST', page: 2, page_size: 10 }));
    expect(screen.getAllByTestId('food-orders-row-p9')).toHaveLength(1);
    expect(within(screen.getByTestId('food-orders-past-list')).getAllByRole('listitem')).toHaveLength(11);
    await waitFor(() => expect(screen.queryByTestId('food-orders-past-more')).not.toBeInTheDocument());
  });

  it('keeps the shown orders and says so when the next page fails, leaving "Show more" to try again', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    renderPage([
      pageMock('CURRENT', 1, { rows: [] }),
      pageMock('PAST', 1, { rows: firstPage, total: 11 }),
      pageMock('PAST', 2, new Error('Network down')),
    ]);
    fireEvent.click(await screen.findByTestId('food-orders-past-more'));

    expect(await screen.findByTestId('food-orders-past-more-failed')).toHaveTextContent(
      'Your food orders could not be loaded.',
    );
    expect(warn).toHaveBeenCalledWith('venueFood', 'myOrdersMore', expect.objectContaining({ scope: 'PAST' }));
    expect(within(screen.getByTestId('food-orders-past-list')).getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByTestId('food-orders-past-more')).toBeEnabled();
  });
});

describe('FoodOrdersPage — signed out', () => {
  it('asks a guest to sign in for every device, coming back here after', async () => {
    localStorage.removeItem('token');
    renderPage([pageMock('CURRENT', 1, { rows: [] }), pageMock('PAST', 1, { rows: [] })]);
    const hint = screen.getByTestId('food-orders-sign-in');
    const link = within(hint).getByRole('link', {
      name: 'Sign in to see your food orders on every device. Orders placed on this device show here either way.',
    });
    expect(link).toHaveAttribute('href', '/login?redirect=%2Ffood-orders');
    // A guest still sees this device's orders.
    expect(await screen.findByTestId('food-orders-current-empty')).toBeInTheDocument();
  });

  it('treats a browser whose storage is blocked as signed out, still listing what it can', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    renderPage([pageMock('CURRENT', 1, { rows: [] }), pageMock('PAST', 1, { rows: [] })]);
    expect(screen.getByTestId('food-orders-sign-in')).toBeInTheDocument();
    expect(await screen.findByTestId('food-orders-current-empty')).toBeInTheDocument();
  });

  it('shows no sign-in hint to a member', () => {
    renderPage([pageMock('CURRENT', 1, { rows: [] }), pageMock('PAST', 1, { rows: [] })]);
    expect(screen.queryByTestId('food-orders-sign-in')).not.toBeInTheDocument();
  });
});
