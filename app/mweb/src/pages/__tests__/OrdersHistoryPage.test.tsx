import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { MockedProvider } from '@apollo/client/testing';
import OrdersHistoryPage from '../OrdersHistoryPage';
import { MY_PRODUCT_ORDERS, type ProductOrder } from '../pod-history-page/productOrders';

const baseOrder = (over: Partial<ProductOrder> = {}): ProductOrder => ({
  id: 'ord-1',
  order_no: 'PO-1001',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'SHIPPED',
  currency_symbol: '₹',
  items_total: 1500,
  total: 1600,
  pickup_ref: '',
  pickup_location_id: '',
  created_at: '2026-07-01T00:00:00.000Z',
  pod: { id: 'pod-1', pod_title: 'Morning Yoga Pod' },
  line_items: [
    {
      product_id: 'p-1',
      variant_id: 'v-1',
      variant_label: 'Blue / M',
      name: 'Yoga Mat',
      image_url: 'https://img/mat.jpg',
      qty: 1,
      unit_cost: 1500,
      gross: 1500,
    },
  ],
  shipping_address: { name: 'A', line1: 'L1', city: 'Pune', state: 'MH', pincode: '411001' },
  shiprocket: { awb: 'AWB123', courier_name: 'BlueDart', tracking_status: 'IN_TRANSIT', label_url: '' },
  tracking_events: [],
  ...over,
});

const ordersMock = (orders: ProductOrder[]) => ({
  request: { query: MY_PRODUCT_ORDERS },
  result: { data: { myProductOrders: orders } },
});

const renderPage = (mocks: readonly unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <OrdersHistoryPage />
    </MockedProvider>,
  );

describe('OrdersHistoryPage', () => {
  it('shows a spinner while loading with no cached data', () => {
    renderPage([ordersMock([baseOrder()])]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the empty state when the buyer has no product orders', async () => {
    renderPage([ordersMock([])]);
    expect(await screen.findByText('No product orders yet')).toBeInTheDocument();
    expect(screen.getByText(/will show up here with tracking/i)).toBeInTheDocument();
  });

  it('renders the populated list with header, pod title and order item', async () => {
    renderPage([ordersMock([baseOrder()])]);
    expect(await screen.findByText('My Product Orders')).toBeInTheDocument();
    expect(screen.getByText(/live tracking/i)).toBeInTheDocument();
    // pod title caption
    expect(screen.getByText('Morning Yoga Pod')).toBeInTheDocument();
    // order item content (from PodProductOrderItem)
    expect(screen.getByText('#PO-1001')).toBeInTheDocument();
    expect(screen.getByText(/Yoga Mat/)).toBeInTheDocument();
  });

  it('omits the pod title caption when the order has no pod', async () => {
    renderPage([ordersMock([baseOrder({ id: 'ord-2', order_no: 'PO-2002', pod: null })])]);
    await screen.findByText('My Product Orders');
    expect(screen.getByText('#PO-2002')).toBeInTheDocument();
    expect(screen.queryByText('Morning Yoga Pod')).not.toBeInTheDocument();
  });

  it('renders an error alert when the query fails', async () => {
    const errorMock = {
      request: { query: MY_PRODUCT_ORDERS },
      result: { errors: [new GraphQLError('Boom failed')] },
    };
    renderPage([errorMock]);
    expect(await screen.findByText(/Boom failed/)).toBeInTheDocument();
  });
});
