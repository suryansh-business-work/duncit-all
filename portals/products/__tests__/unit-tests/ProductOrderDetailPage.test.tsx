import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductOrderDetailPage from '../../src/pages/orders/ProductOrderDetailPage';
import { renderWithProviders } from '../testkit';
import {
  advanceStatusMock,
  createShipmentMock,
  makeProductOrder,
  productOrderMock,
  refreshTrackingMock,
  setFulfilmentMethodMock,
} from '../mocks/order.mock';

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

const order = makeProductOrder({ fulfilment_status: 'PENDING' });

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/orders/o1'],
    routes: <Route path="/orders/:orderId" element={<ProductOrderDetailPage />} />,
  });

describe('ProductOrderDetailPage', () => {
  it('shows the not-found state and navigates back', async () => {
    renderPage([productOrderMock(null)]);
    await waitFor(() => expect(screen.getByText('Order not found.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Back to orders/i }));
    expect(nav.fn).toHaveBeenCalledWith('/orders');
  });

  it('renders the order and updates the fulfilment method', async () => {
    renderPage([productOrderMock(order), setFulfilmentMethodMock()]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    await panel.props?.onSetMethod('PICKUP');
    await waitFor(() =>
      expect(screen.getByText('Fulfilment method updated')).toBeInTheDocument(),
    );
    // Dismiss the toast (Snackbar onClose) and go back to the list.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText('Fulfilment method updated')).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Back to orders/i }));
    expect(nav.fn).toHaveBeenCalledWith('/orders');
  });

  it('advances the status', async () => {
    renderPage([productOrderMock(order), advanceStatusMock()]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    await panel.props?.onAdvance('SHIPPED', '');
    await waitFor(() => expect(screen.getByText('Status updated')).toBeInTheDocument());
  });

  it('surfaces an action error and dismisses it', async () => {
    renderPage([productOrderMock(order), refreshTrackingMock({ fail: true })]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    await panel.props?.onRefreshTracking();
    await waitFor(() => expect(screen.getByText(/action failed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText(/action failed/i)).not.toBeInTheDocument());
  });

  it('creates a shipment through the dialog', async () => {
    renderPage([productOrderMock(order), createShipmentMock()]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    panel.props?.onCreateShipment();
    await waitFor(() => expect(screen.getByTestId('ship-dialog')).toBeInTheDocument());
    await shipment.props?.onConfirm('loc1');
    await waitFor(() => expect(screen.getByText('Shipment created')).toBeInTheDocument());
  });

  it('opens and closes the shipment dialog', async () => {
    renderPage([productOrderMock(order)]);
    await waitFor(() => expect(screen.getByText('PO-1')).toBeInTheDocument());
    panel.props?.onCreateShipment();
    await waitFor(() => expect(screen.getByTestId('ship-dialog')).toBeInTheDocument());
    act(() => shipment.props?.onClose());
    await waitFor(() => expect(screen.queryByTestId('ship-dialog')).not.toBeInTheDocument());
  });
});
