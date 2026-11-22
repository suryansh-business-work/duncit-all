/**
 * Loyalty > Gift Card Orders — the order book with what each order waits on,
 * and one order's page: facts, delivery and tracking, the audit trail, and the
 * fulfilment step that comes next (print, fix address, book, track, label).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import * as utils from '@duncit/utils';
import { GiftCardOrderDetailPage, GiftCardOrdersPage } from '../../src/pages/gift-cards/orders';
import OrderActions from '../../src/pages/gift-cards/orders/detail/OrderActions';
import OrderHistorySection from '../../src/pages/gift-cards/orders/detail/OrderHistorySection';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { resetUserContext, userContextControls } from './mocks/user-context';
import { renderWithProviders } from '../testkit';
import {
  bookMock,
  labelErrorMock,
  labelMock,
  makeEvent,
  makeHistory,
  makeOrder,
  makeShipment,
  markPrintedErrorMock,
  markPrintedMock,
  orderAdminMock,
  orderCurrencyMock,
  orderStatsMock,
  refreshMock,
  updateAddressErrorMock,
  updateAddressMock,
} from '../mocks/gift-card-order.mock';

/** What the booking confirmation answers — declined in one test. */
const confirmAnswer = vi.hoisted(() => ({ value: true }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirm: () => async () => confirmAnswer.value,
}));

vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  printBase64File: vi.fn(),
  downloadBase64File: vi.fn(),
}));

const asWriter = () => {
  userContextControls.user = { roles: ['LOYALTY_MANAGER'] };
};

beforeEach(() => {
  resetTableControls();
  resetUserContext();
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
  confirmAnswer.value = true;
});

const cell = (index: number, field: string) =>
  within(screen.getAllByTestId('table-row')[index]).getByTestId(`cell-${field}`);

const detail = (order: ReturnType<typeof makeOrder>, mocks: any[] = [], history = [makeHistory()]) =>
  renderWithProviders(<GiftCardOrderDetailPage />, {
    mocks: [orderAdminMock(order, history), ...mocks],
    path: '/gift-cards/orders/:id',
    entry: `/gift-cards/orders/${order.id}`,
  });

describe('GiftCardOrdersPage', () => {
  it('shows the book’s tiles and every order with its payment and status', async () => {
    tableControls.rowsByKey = {
      giftCardOrdersTable: [
        makeOrder(),
        makeOrder({ id: 'ord-2', order_no: 'GC-DIGITAL222', delivery_mode: 'DIGITAL', design_name: '', payment_status: 'PENDING', fulfilment_status: 'PENDING' }),
        makeOrder({ id: 'ord-3', shipment: makeShipment(), fulfilment_status: 'SHIPPED' }),
      ],
    };
    renderWithProviders(<GiftCardOrdersPage />, {
      mocks: [orderStatsMock(), orderCurrencyMock()],
      path: '/',
      entry: '/',
      extra: <Route path="/gift-cards/orders/:id" element={<div data-testid="opened">opened</div>} />,
    });

    expect(await screen.findByRole('heading', { name: 'Gift Card Orders' })).toBeInTheDocument();
    expect(await screen.findByText('₹25,400')).toBeInTheDocument();
    expect(screen.getByText('12 paid · 3 awaiting payment')).toBeInTheDocument();
    expect(screen.getByText('1 printed, waiting for the courier')).toBeInTheDocument();
    expect(screen.getByText('1 need attention')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(3));
    expect(cell(0, 'delivery_mode')).toHaveTextContent('Printed, by courier');
    expect(cell(0, 'fulfilment_status')).toHaveTextContent('To print');
    expect(cell(0, 'total')).toHaveTextContent('₹1,099.00');
    expect(cell(0, 'awb')).toHaveTextContent('—');
    expect(cell(1, 'design_name')).toHaveTextContent('—');
    expect(cell(1, 'payment_status')).toHaveTextContent('Awaiting payment');
    expect(cell(2, 'awb')).toHaveTextContent('AWB123');
    expect(cell(2, 'buyer_name')).toHaveTextContent('Aarav Shah');

    fireEvent.click(screen.getAllByTestId('table-row')[0]);
    expect(await screen.findByTestId('opened')).toBeInTheDocument();
  });

  it('shows zeroes while the stats load', async () => {
    tableControls.rowsByKey = { giftCardOrdersTable: [] };
    renderWithProviders(<GiftCardOrdersPage />, { mocks: [orderCurrencyMock()] });
    expect(await screen.findByText('0 paid · 0 awaiting payment')).toBeInTheDocument();
  });
});

describe('GiftCardOrderDetailPage — a paid printed order', () => {
  it('reads the facts, alerts and history of an order waiting to be printed', async () => {
    const order = makeOrder({ stock_short: true, last_error: 'Pincode not serviceable', shipment_sandbox: true, shipment_alert_message: 'Recharge the ShipRocket wallet' });
    detail(order, [], [makeHistory({ action: 'ORDER_PRINTED', actor_name: 'Loyalty Lead', note: '2 card(s)' }), makeHistory({ id: 'h-2', action: 'SOMETHING_NEW' })]);
    expect(await screen.findByRole('heading', { name: 'Order GC-ABCDEFGH23' })).toBeInTheDocument();
    expect(screen.getByText('Paid while printed stock could not cover 2 cards — print more before shipping.')).toBeInTheDocument();
    expect(screen.getByText('The courier booking was refused: Pincode not serviceable')).toBeInTheDocument();
    expect(screen.getByText('Recharge the ShipRocket wallet')).toBeInTheDocument();
    expect(screen.getByText(/ShipRocket sandbox/)).toBeInTheDocument();
    expect(screen.getByText('2 × ₹500.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the printed batch' })).toHaveAttribute('href', '/gift-cards/physical/batches/batch-1');
    expect(screen.getByText('No courier updates yet.')).toBeInTheDocument();
    const history = screen.getByTestId('gift-order-history');
    expect(within(history).getByText('Marked printed')).toBeInTheDocument();
    expect(within(history).getByText('SOMETHING_NEW')).toBeInTheDocument();
    expect(within(history).getByText(/Loyalty Lead/)).toBeInTheDocument();
    // A read-only seat sees no fulfilment buttons.
    expect(screen.queryByTestId('gift-order-printed')).toBeNull();
  });

  it('marks the cards printed, and reports a refusal', async () => {
    asWriter();
    const order = makeOrder();
    detail(order, [markPrintedMock(), markPrintedErrorMock(order.id, 'This order is already past printing')]);
    fireEvent.click(await screen.findByTestId('gift-order-printed'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Marked printed'));
  });

  it('reports a refused action with the server’s reason or its own words', async () => {
    asWriter();
    const order = makeOrder();
    detail(order, [markPrintedErrorMock(order.id, 'This order is already past printing')]);
    fireEvent.click(await screen.findByTestId('gift-order-printed'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('This order is already past printing'));
  });

  it('falls back to its own words when a refusal carries none', async () => {
    asWriter();
    const order = makeOrder();
    detail(order, [{ request: markPrintedMock().request, error: new Error('') }]);
    fireEvent.click(await screen.findByTestId('gift-order-printed'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('That did not work. Please try again.'));
  });

  it('fixes the address before booking, keeping the dialog open on a refusal', async () => {
    asWriter();
    const order = makeOrder({ fulfilment_status: 'PRINTED' });
    const input = { name: 'Priya Nair', phone: '9876543210', line1: '12 MG Road', line2: 'Indiranagar', landmark: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', country: 'India' };
    detail(order, [updateAddressErrorMock(order.id, input, 'The courier is already booked'), updateAddressMock(order.id, input)]);
    fireEvent.click(await screen.findByTestId('gift-order-address'));
    fireEvent.click(screen.getByTestId('order-address-submit'));
    expect(await screen.findByText('The courier is already booked')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('order-address-submit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Address updated'));
    await waitFor(() => expect(screen.queryByTestId('order-address-form')).toBeNull());
    // Opening again starts with no stale refusal; cancelling closes it.
    fireEvent.click(screen.getByTestId('gift-order-address'));
    expect(screen.queryByText('The courier is already booked')).toBeNull();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByTestId('order-address-form')).toBeNull());
  });

  it('books the courier once the cards are printed', async () => {
    asWriter();
    const order = makeOrder({ fulfilment_status: 'PRINTED' });
    detail(order, [bookMock()]);
    fireEvent.click(await screen.findByTestId('gift-order-book'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Courier booked'));
  });

  it('follows a booked parcel: tracking, refresh and the label', async () => {
    asWriter();
    const order = makeOrder({
      fulfilment_status: 'SHIPPED',
      label_available: true,
      shipment: makeShipment(),
      tracking_events: [makeEvent('Picked up', '2026-11-22T10:00:00.000Z'), makeEvent('In transit', '2026-11-23T08:00:00.000Z', 'Hub')],
    });
    detail(order, [refreshMock(order), labelMock(order.id, 'JVBERi0='), labelMock(order.id, 'JVBERi0='), labelMock(order.id, null), labelErrorMock(order.id, 'Label not ready')]);
    const tracking = await screen.findByTestId('gift-order-tracking');
    const scans = within(tracking).getAllByRole('listitem');
    // Newest first.
    expect(scans[0]).toHaveTextContent('In transit');
    expect(scans[0]).toHaveTextContent('Hub');
    expect(scans[1]).toHaveTextContent('Picked up');
    expect(screen.getByText('AWB123')).toBeInTheDocument();
    expect(screen.queryByTestId('gift-order-address')).toBeNull();
    expect(screen.queryByTestId('gift-order-book')).toBeNull();

    fireEvent.click(screen.getByTestId('gift-order-refresh'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Tracking updated'));
    fireEvent.click(screen.getByText('Print label'));
    await waitFor(() => expect(utils.printBase64File).toHaveBeenCalledWith('JVBERi0=', 'application/pdf', order.order_no));
    fireEvent.click(screen.getByText('Download label'));
    await waitFor(() => expect(utils.downloadBase64File).toHaveBeenCalledWith('JVBERi0=', `${order.order_no}-label.pdf`, 'application/pdf'));
    fireEvent.click(screen.getByText('Download label'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The label could not be fetched. Please try again.'));
    fireEvent.click(screen.getByText('Print label'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Label not ready'));
  });

  it('offers a retry for a booking that stopped half way', async () => {
    asWriter();
    detail(makeOrder({ fulfilment_status: 'AWAITING_SHIPMENT', shipment: makeShipment({ awb: '', courier_name: '', last_synced_at: null }) }));
    expect(await screen.findByTestId('gift-order-book')).toHaveTextContent('Retry booking');
  });
});

describe('GiftCardOrderDetailPage — other orders', () => {
  it('shows a digital order’s cards with no delivery section or actions', async () => {
    asWriter();
    detail(makeOrder({ delivery_mode: 'DIGITAL', shipping_address: null, physical_batch_id: null, cards_issued: 3, recipient_name: '', recipient_email: 'friend@x.com', message: '', buyer_phone: '', design_front_url: '', paid_at: null }));
    expect(await screen.findByText('3 issued')).toBeInTheDocument();
    expect(screen.getByText('friend@x.com')).toBeInTheDocument();
    expect(screen.queryByText('Deliver to')).toBeNull();
    expect(screen.queryByTestId('gift-order-printed')).toBeNull();
  });

  it('says so when the order does not exist', async () => {
    renderWithProviders(<GiftCardOrderDetailPage />, {
      mocks: [{ request: orderAdminMock(makeOrder({ id: 'nope' })).request, result: { data: { giftCardOrderAdmin: null } } }],
      path: '/gift-cards/orders/:id',
      entry: '/gift-cards/orders/nope',
    });
    expect(await screen.findByText('This record does not exist, or it was removed.')).toBeInTheDocument();
  });
});

describe('OrderActions', () => {
  const noop = () => undefined;
  const handlers = { onMarkPrinted: noop, onBook: vi.fn(), onRefresh: noop, onPrintLabel: noop, onDownloadLabel: noop, onEditAddress: noop };

  it('has nothing to offer an unpaid order', () => {
    const { container } = renderWithProviders(<OrderActions order={makeOrder({ payment_status: 'PENDING' })} busy={false} {...handlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not book when the confirmation is declined', async () => {
    confirmAnswer.value = false;
    renderWithProviders(<OrderActions order={makeOrder({ fulfilment_status: 'PRINTED' })} busy={false} {...handlers} />);
    fireEvent.click(screen.getByTestId('gift-order-book'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(handlers.onBook).not.toHaveBeenCalled();
  });
});

describe('OrderHistorySection', () => {
  it('names the system when nobody acted', () => {
    renderWithProviders(<OrderHistorySection history={[makeHistory({ action: 'STATUS_CHANGED', note: 'SHIPPED (IN TRANSIT)' })]} />);
    expect(screen.getByText('Courier update')).toBeInTheDocument();
    expect(screen.getByText(/System/)).toBeInTheDocument();
  });
});
