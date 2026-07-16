import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ProductOrderDetailPage from '../../src/pages/orders/ProductOrderDetailPage';
import {
  ADVANCE_PRODUCT_ORDER_STATUS,
  CREATE_PRODUCT_ORDER_SHIPMENT,
  PRODUCT_ORDER,
  REFRESH_PRODUCT_ORDER_TRACKING,
  SET_PRODUCT_ORDER_FULFILMENT_METHOD,
} from '../../src/pages/orders/queries';
import { renderWithProviders } from './testkit';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (v: unknown) => (v ? 'DT' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('../../src/pages/orders/OrderSummaryCard', () => ({ default: () => <div>SUMMARY</div> }));
vi.mock('../../src/pages/orders/OrderTrackingTimeline', () => ({ default: () => <div>TIMELINE</div> }));

const panel = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/orders/OrderFulfilmentPanel', () => ({
  default: (props: Record<string, any>) => {
    panel.props = props;
    return <div data-testid="panel" />;
  },
}));
const shipment = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/orders/OrderShipmentDialog', () => ({
  default: (props: Record<string, any>) => {
    shipment.props = props;
    return props.open ? <div data-testid="ship-dialog" /> : null;
  },
}));

const order = {
  id: 'o1',
  order_no: 'PO-1',
  fulfilment_status: 'PENDING',
  fulfilment_method: 'SHIP',
  pod: { pod_date_time: '2026-01-01' },
  tracking_events: [],
  line_items: [],
};

const orderMock = (data: unknown): MockedResponse => ({
  request: { query: PRODUCT_ORDER, variables: { id: 'o1' } },
  result: { data: { productOrder: data } },
  maxUsageCount: 20,
});
const mut = (query: any, data: Record<string, unknown>, fail = false): MockedResponse => ({
  request: { query },
  variableMatcher: () => true,
  result: fail ? { errors: [{ message: 'action failed' }] } : { data },
  maxUsageCount: 20,
});

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/orders/o1'],
    routes: <Route path="/orders/:orderId" element={<ProductOrderDetailPage />} />,
  });

describe('ProductOrderDetailPage', () => {
  it('shows the not-found state and navigates back', async () => {
    renderPage([orderMock(null)]);
    await waitFor(() => expect(screen.getByText('Order not found.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Back to orders/i }));
    expect(nav.fn).toHaveBeenCalledWith('/orders');
  });

  it('renders the order and updates the fulfilment method', async () => {
    renderPage([
      orderMock(order),
      mut(SET_PRODUCT_ORDER_FULFILMENT_METHOD, { setProductOrderFulfilmentMethod: { id: 'o1' } }),
    ]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    await panel.props?.onSetMethod('PICKUP');
    await waitFor(() =>
      expect(screen.getByText('Fulfilment method updated')).toBeInTheDocument(),
    );
  });

  it('advances the status', async () => {
    renderPage([
      orderMock(order),
      mut(ADVANCE_PRODUCT_ORDER_STATUS, { advanceProductOrderStatus: { id: 'o1' } }),
    ]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    await panel.props?.onAdvance('SHIPPED', '');
    await waitFor(() => expect(screen.getByText('Status updated')).toBeInTheDocument());
  });

  it('surfaces an action error and dismisses it', async () => {
    renderPage([
      orderMock(order),
      mut(REFRESH_PRODUCT_ORDER_TRACKING, {}, true),
    ]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    await panel.props?.onRefreshTracking();
    await waitFor(() => expect(screen.getByText(/action failed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText(/action failed/i)).not.toBeInTheDocument());
  });

  it('creates a shipment through the dialog', async () => {
    renderPage([
      orderMock(order),
      mut(CREATE_PRODUCT_ORDER_SHIPMENT, { createProductOrderShipment: { id: 'o1' } }),
    ]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    panel.props?.onCreateShipment();
    await waitFor(() => expect(screen.getByTestId('ship-dialog')).toBeInTheDocument());
    await shipment.props?.onConfirm('loc1');
    await waitFor(() => expect(screen.getByText('Shipment created')).toBeInTheDocument());
  });
});
