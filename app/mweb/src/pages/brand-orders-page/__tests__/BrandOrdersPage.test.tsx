import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { brandOrdersTableQuery } from '@duncit/utils';
import BrandOrdersPage from '..';
import { BRAND_ORDERS_TABLE } from '../queries';

const row = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'ProductOrder',
  id,
  order_no: `DUN-${id}`,
  buyer_name: 'Riya',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'PENDING',
  currency_symbol: '₹',
  total: 499,
  created_at: '2026-10-01T10:00:00.000Z',
  line_items: [{ __typename: 'OrderLineItem', qty: 2 }],
  shiprocket: { __typename: 'ShipRocketInfo', awb: '' },
  ...over,
});

const tableMock = (view: { page?: number; status?: string; search?: string }, rows: unknown[], total = rows.length): MockedResponse => ({
  request: { query: BRAND_ORDERS_TABLE, variables: { query: brandOrdersTableQuery({ page: 1, ...view }) } },
  result: {
    data: { brandProductOrdersTable: { __typename: 'ProductOrderTablePage', total, page: view.page ?? 1, page_size: 20, rows } },
  },
});

function Where() {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
}

function renderPage(mocks: MockedResponse[], entry = '/products/orders') {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/products/orders" element={<><BrandOrdersPage /><Where /></>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('BrandOrdersPage', () => {
  it('lists the brand’s orders with buyer, items, total, status and AWB; a tap opens one', async () => {
    renderPage([tableMock({}, [row('1'), row('2', { fulfilment_status: 'SHIPPED', shiprocket: { __typename: 'ShipRocketInfo', awb: 'AWB9' } })])]);
    const first = await screen.findByTestId('brand-order-1');
    expect(within(first).getByText('Order #DUN-1')).toBeInTheDocument();
    expect(first).toHaveTextContent('Riya · 2 items');
    expect(screen.getByTestId('brand-order-status-1')).toHaveTextContent('Order placed');
    expect(screen.getByTestId('brand-order-awb-1')).toHaveTextContent('No AWB yet');
    expect(screen.getByTestId('brand-order-awb-2')).toHaveTextContent('AWB AWB9');
    fireEvent.click(first);
    expect(screen.getByTestId('where')).toHaveTextContent('/products/orders/1');
  });

  it('filters by status from the first page, keeping the view in the URL', async () => {
    renderPage([tableMock({}, [row('1')]), tableMock({ status: 'FAILED' }, [row('3', { fulfilment_status: 'FAILED' })])]);
    await screen.findByTestId('brand-order-1');
    fireEvent.click(screen.getByTestId('brand-orders-status-FAILED'));
    expect(await screen.findByTestId('brand-order-3')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/products/orders?status=FAILED');
    expect(screen.getByTestId('brand-orders-status-FAILED')).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens on the page and search the URL names, and pages on', async () => {
    renderPage(
      [
        tableMock({ page: 2, search: 'DUN' }, [row('21')], 45),
        tableMock({ page: 3, search: 'DUN' }, [row('41')], 45),
      ],
      '/products/orders?q=DUN&page=2',
    );
    await screen.findByTestId('brand-order-21');
    expect(screen.getByTestId('brand-orders-search')).toHaveValue('DUN');
    fireEvent.click(screen.getByRole('button', { name: 'Page 3 of 3' }));
    expect(await screen.findByTestId('brand-order-41')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('q=DUN&page=3');
  });

  it('tells a brand with no orders apart from a filter that matched none', async () => {
    const { unmount } = renderPage([tableMock({}, [])]);
    expect(await screen.findByTestId('brand-orders-empty')).toHaveTextContent('No Pod Shop orders for your brands yet.');
    unmount();
    renderPage([tableMock({ status: 'LOST' }, [])], '/products/orders?status=LOST');
    expect(await screen.findByTestId('brand-orders-empty')).toHaveTextContent('No orders match this search or status.');
  });

  it('says why the list did not load', async () => {
    renderPage([{ request: tableMock({}, []).request, error: new Error('Network down') }]);
    expect(await screen.findByTestId('brand-orders-error')).toHaveTextContent('Network down');
    expect(screen.getByTestId('brand-orders-retry')).toBeInTheDocument();
  });
});
