import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import OrderShipmentCard from '../OrderShipmentCard';
import OrderDetailTimeline from '../OrderDetailTimeline';
import OrderItemsCard from '../OrderItemsCard';
import OrderActionsCard from '../OrderActionsCard';
import OrderDetailPage from '../index';
import { useOrderDownloads } from '../useOrderDownloads';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useLazyQuery: vi.fn(),
  useMutation: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  download: vi.fn(),
  invoiceHook: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
  useLazyQuery: h.useLazyQuery,
  useMutation: h.useMutation,
}));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), downloadBase64File: h.download }));
vi.mock('../useOrderDownloads', async (orig) => {
  const real = await orig<typeof import('../useOrderDownloads')>();
  return { useOrderDownloads: (...args: Parameters<typeof real.useOrderDownloads>) => (h.invoiceHook.getMockImplementation() ? h.invoiceHook(...args) : real.useOrderDownloads(...args)) };
});
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));
vi.mock('../../orders-history-page/OrderReturnsSection', () => ({
  default: (p: { returns: unknown[]; onReturn: () => void; onCancelReturn: (r: unknown) => void }) => (
    <div data-testid="returns-section" data-count={p.returns.length}>
      <button data-testid="start-return" onClick={p.onReturn} />
      <button data-testid="cancel-return" onClick={() => p.onCancelReturn({ id: 'r1' })} />
    </div>
  ),
}));
vi.mock('../../orders-history-page/OrderStatusNotes', () => ({ default: () => <div data-testid="notes" /> }));
vi.mock('../../orders-history-page/PodShopReturnDialog', () => ({
  default: (p: { order: unknown; onClose: () => void; onRequested: () => void }) => (p.order ? <div data-testid="return-dialog"><button data-testid="return-requested" onClick={p.onRequested} /><button data-testid="return-close" onClick={p.onClose} /></div> : null),
}));
vi.mock('../../orders-history-page/CancelReturnDialog', () => ({
  default: (p: { target: unknown; onClose: () => void; onCancelled: () => void }) => (p.target ? <div data-testid="cancel-dialog"><button data-testid="cancelled" onClick={p.onCancelled} /><button data-testid="cancel-close" onClick={p.onClose} /></div> : null),
}));

const Where = () => {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
};
const inRouter = (ui: React.ReactNode, path = '/orders/o1') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orders/:orderId" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const order = (over: object = {}) => ({
  id: 'o1',
  order_no: 'PO-77',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'SHIPPED',
  currency_symbol: '₹',
  payment_id: 'pay1',
  payment_ref: 'rzp_123',
  payment_method: 'PREPAID',
  items_total: 900,
  shipping_charge: 50,
  discount_total: 0,
  coins_share: 0,
  total: 950,
  created_at: '2026-06-01T10:00:00.000Z',
  cancelled_at: null,
  pod: { pod_title: 'Sunday Run' },
  line_items: [{ product_id: 'p1', variant_id: 'v1', name: 'Tee', variant_label: 'L', qty: 2, unit_cost: 450, gross: 900, image_url: 'https://img/t.png' }],
  shipping_address: { name: 'Asha', phone: '999', line1: '12 MG Road', line2: '', landmark: 'Near park', city: 'Pune', state: 'MH', pincode: '411001', country: 'India' },
  shiprocket: { awb: 'AWB123', courier_name: 'Delhivery', etd: '2026-06-05', tracking_status: 'In transit', shipment_id: 'sh1' },
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('OrderShipmentCard', () => {
  it('shows a shipped order with courier, AWB, estimate, status, tracking link and delivery address', () => {
    render(<OrderShipmentCard order={order() as never} />);
    expect(screen.getByTestId('order-courier')).toHaveTextContent('Delhivery');
    expect(screen.getByTestId('order-awb')).toHaveTextContent('AWB123');
    expect(screen.getByTestId('order-etd')).toHaveTextContent('2026-06-05');
    expect(screen.getByTestId('order-courier-status')).toHaveTextContent('In transit');
    expect(screen.getByTestId('order-track')).toHaveAttribute('href', 'https://shiprocket.co/tracking/AWB123');
    expect(screen.getByTestId('order-address')).toHaveTextContent('Near park');
    expect(screen.queryByTestId('order-not-shipped')).not.toBeInTheDocument();
  });

  it('copies the AWB and confirms, or says when the clipboard refuses', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<OrderShipmentCard order={order() as never} />);
    fireEvent.click(screen.getByTestId('order-copy-awb'));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.orderDetail.awbCopied')));
    expect(writeText).toHaveBeenCalledWith('AWB123');
    writeText.mockRejectedValue(new Error('denied'));
    fireEvent.click(screen.getByTestId('order-copy-awb'));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith(fallbackT('mweb.orderDetail.copyFailed')));
  });

  it('says the order has not shipped yet when there is no AWB, with no copy or track buttons and no empty facts', () => {
    render(<OrderShipmentCard order={order({ shiprocket: { awb: '', courier_name: '', etd: '', tracking_status: '', shipment_id: '' }, shipping_address: null }) as never} />);
    expect(screen.getByTestId('order-not-shipped')).toBeInTheDocument();
    expect(screen.queryByTestId('order-copy-awb')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-track')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-courier')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-address')).not.toBeInTheDocument();
  });

  it('shows the pickup code and place for a collected order', () => {
    render(<OrderShipmentCard order={order({ fulfilment_method: 'PICKUP', pickup_ref: 'K7F2', pickup_location_id: 'Counter 3' }) as never} />);
    expect(screen.getByTestId('order-pickup-code')).toHaveTextContent('K7F2');
    expect(screen.getByTestId('order-pickup-location')).toHaveTextContent('Counter 3');
    expect(screen.queryByTestId('order-shipment')).not.toBeInTheDocument();
  });

  it('hides a pickup fact that is missing', () => {
    render(<OrderShipmentCard order={order({ fulfilment_method: 'PICKUP', pickup_ref: '', pickup_location_id: '' }) as never} />);
    expect(screen.getByTestId('order-pickup')).toBeInTheDocument();
    expect(screen.queryByTestId('order-pickup-code')).not.toBeInTheDocument();
  });
});

describe('OrderDetailTimeline', () => {
  const step = (over: object) => ({ status: 'PLACED', label: 'Placed', done: false, current: false, tone: 'normal', at: null, note: '', scans: [], ...over });

  it('marks done, current and upcoming steps and says each state to a screen reader', () => {
    render(
      <OrderDetailTimeline
        testId="tl"
        steps={[
          step({ status: 'PLACED', label: 'Placed', done: true, at: '2026-06-01T10:00:00.000Z' }),
          step({ status: 'SHIPPED', label: 'Shipped', current: true, tone: 'normal' }),
          step({ status: 'DELIVERED', label: 'Delivered' }),
        ] as never}
      />
    );
    expect(screen.getByTestId('order-step-SHIPPED')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('order-step-PLACED')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('order-step-PLACED')).toHaveTextContent(fallbackT('mweb.orderDetail.stepDone'));
    expect(screen.getByTestId('order-step-SHIPPED')).toHaveTextContent(fallbackT('mweb.orderDetail.stepCurrent'));
    expect(screen.getByTestId('order-step-DELIVERED')).toHaveTextContent(fallbackT('mweb.orderDetail.stepUpcoming'));
    expect(screen.getByTestId('order-step-at-PLACED')).toHaveTextContent('at:2026-06-01T10:00:00.000Z');
  });

  it.each([
    ['failed', 'NDR', 'CancelIcon'],
    ['normal', 'CANCELLED', 'CancelIcon'],
    ['done', 'DELIVERED', 'CheckCircleIcon'],
    ['normal', 'SHIPPED', 'RadioButtonCheckedIcon'],
  ])('draws the current step with tone %s and status %s using the right dot', (tone, status, icon) => {
    render(<OrderDetailTimeline steps={[step({ status, tone, current: true, label: 'Now' })] as never} />);
    expect(screen.getByTestId(icon)).toBeInTheDocument();
  });

  it('shows courier scans with time, place and note, and a note only when there are no scans', () => {
    render(
      <OrderDetailTimeline
        steps={[
          step({
            status: 'SHIPPED',
            label: 'Shipped',
            current: true,
            scans: [
              { at: '2026-06-02T09:00:00.000Z', label: 'Picked up', location: 'Pune Hub', note: 'Bag received' },
              { at: null, label: 'Out for delivery', location: '', note: '' },
            ],
          }),
          step({ status: 'DELIVERED', label: 'Delivered', note: 'Left at gate' }),
        ] as never}
      />
    );
    const scans = screen.getByTestId('order-step-scans-SHIPPED');
    expect(scans).toHaveTextContent('at:2026-06-02T09:00:00.000Z · Picked up · Pune Hub · Bag received');
    expect(scans).toHaveTextContent('Out for delivery');
    expect(scans).not.toHaveTextContent('· Out for delivery ·');
    expect(screen.getByTestId('order-step-DELIVERED')).toHaveTextContent('Left at gate');
    expect(screen.queryByTestId('order-step-scans-DELIVERED')).not.toBeInTheDocument();
  });

  it('shows a scan with only a place, or only a note', () => {
    render(
      <OrderDetailTimeline
        steps={[step({ status: 'SHIPPED', label: 'Shipped', scans: [{ at: '2026-06-02T09:00:00.000Z', label: 'A', location: 'Hub', note: '' }, { at: '2026-06-02T10:00:00.000Z', label: 'B', location: '', note: 'Late' }] })] as never}
      />
    );
    expect(screen.getByText(/A · Hub/)).toBeInTheDocument();
    expect(screen.getByText(/B · Late/)).toBeInTheDocument();
  });
});

describe('OrderItemsCard', () => {
  it('lists each line and the bill: items, delivery, total, method and payment reference', () => {
    render(<OrderItemsCard order={order() as never} />);
    expect(screen.getByTestId('order-items')).toHaveTextContent('Tee — L');
    expect(screen.getByTestId('order-items-total')).toHaveTextContent('₹900');
    expect(screen.getByTestId('order-delivery-charge')).toHaveTextContent('₹50');
    expect(screen.getByTestId('order-total')).toHaveTextContent('₹950');
    expect(screen.getByTestId('order-payment-method')).toHaveTextContent(fallbackT('mweb.orderDetail.paymentPrepaid'));
    expect(screen.getByTestId('order-payment-ref')).toHaveTextContent('rzp_123');
    expect(screen.queryByTestId('order-discount')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-coins')).not.toBeInTheDocument();
  });

  it('shows a discount, coins used and cash on delivery, and hides delivery for a collected order', () => {
    render(
      <OrderItemsCard
        order={order({ fulfilment_method: 'PICKUP', discount_total: 100, coins_share: 25, payment_method: 'COD', payment_ref: '', line_items: [{ product_id: 'p1', variant_id: '', name: 'Mug', variant_label: '', qty: 1, unit_cost: 100, gross: 100, image_url: '' }] }) as never}
      />
    );
    expect(screen.getByTestId('order-discount')).toHaveTextContent('− ₹100');
    expect(screen.getByTestId('order-coins')).toHaveTextContent('25');
    expect(screen.getByTestId('order-payment-method')).toHaveTextContent(fallbackT('mweb.orderDetail.paymentCod'));
    expect(screen.queryByTestId('order-delivery-charge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-payment-ref')).not.toBeInTheDocument();
    expect(screen.getByTestId('order-items')).toHaveTextContent('Mug');
    expect(screen.getByTestId('order-items')).not.toHaveTextContent('Mug —');
  });
});

describe('OrderActionsCard', () => {
  const card = (o: object, downloads: object = {}) => {
    const hook = { invoiceBusy: false, sellerInvoiceBusy: false, downloadInvoice: vi.fn(), downloadSellerInvoice: vi.fn(), ...downloads };
    h.invoiceHook.mockImplementation(() => hook);
    inRouter(<OrderActionsCard order={o as never} />);
    return hook;
  };

  it('offers both invoices for a booked shipment and downloads each', () => {
    const hook = card(order());
    fireEvent.click(screen.getByTestId('order-download-invoice'));
    fireEvent.click(screen.getByTestId('order-download-seller-invoice'));
    expect(hook.downloadInvoice).toHaveBeenCalledTimes(1);
    expect(hook.downloadSellerInvoice).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('order-seller-invoice-pending')).not.toBeInTheDocument();
  });

  it('says the seller invoice is pending for a shipped order not yet booked, but not once cancelled', () => {
    card(order({ shiprocket: { awb: '', courier_name: '', etd: '', tracking_status: '', shipment_id: '' } }));
    expect(screen.getByTestId('order-seller-invoice-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('order-download-seller-invoice')).not.toBeInTheDocument();
  });

  it('does not promise a seller invoice for a cancelled order or a collected one, nor an invoice without a payment', () => {
    card(order({ shiprocket: { shipment_id: '' }, cancelled_at: '2026-06-02', payment_id: '' }));
    expect(screen.queryByTestId('order-seller-invoice-pending')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-download-invoice')).not.toBeInTheDocument();
  });

  it('does not promise a seller invoice for a collected order', () => {
    card(order({ fulfilment_method: 'PICKUP', shiprocket: { shipment_id: '' } }));
    expect(screen.queryByTestId('order-seller-invoice-pending')).not.toBeInTheDocument();
  });

  it('shows each button busy while its document is prepared', () => {
    card(order(), { invoiceBusy: true, sellerInvoiceBusy: true });
    expect(screen.getByTestId('order-download-invoice')).toBeDisabled();
    expect(screen.getByTestId('order-download-seller-invoice')).toBeDisabled();
  });

  it('opens a support ticket pre-filled with the order, as a payment issue for a refunded one', () => {
    card(order());
    fireEvent.click(screen.getByTestId('order-get-help'));
    const where = screen.getByTestId('where').textContent ?? '';
    expect(where).toContain('/support/tickets?');
    expect(where).toContain('category=QUESTION');
    expect(decodeURIComponent(where)).toContain('PO-77');
  });

  it('files a refunding order under payments', () => {
    card(order({ cancelled_at: '2026-06-02' }));
    fireEvent.click(screen.getByTestId('order-get-help'));
    expect(screen.getByTestId('where').textContent).toContain('category=PAYMENT');
  });
});

describe('useOrderDownloads', () => {
  const setup = (load = vi.fn(), seller = vi.fn(), flags: { invoiceLoading?: boolean; sellerLoading?: boolean } = {}) => {
    h.invoiceHook.mockReset();
    h.useLazyQuery.mockReturnValue([load, { loading: Boolean(flags.invoiceLoading) }]);
    h.useMutation.mockReturnValue([seller, { loading: Boolean(flags.sellerLoading) }]);
    return renderHook(() => useOrderDownloads({ id: 'o1', order_no: 'PO-77', payment_id: 'pay1' }));
  };

  it('downloads the payment invoice as a PDF named after the order', async () => {
    const load = vi.fn().mockResolvedValue({ data: { paymentInvoicePdfBase64: 'JVBER' } });
    const { result } = setup(load);
    await act(async () => result.current.downloadInvoice());
    expect(load).toHaveBeenCalledWith({ variables: { id: 'pay1' } });
    expect(h.download).toHaveBeenCalledWith('JVBER', 'invoice-PO-77.pdf', 'application/pdf');
  });

  it('says the invoice is unavailable when the answer is empty, and shows a refusal in the server words', async () => {
    const { result } = setup(vi.fn().mockResolvedValue({ data: { paymentInvoicePdfBase64: null } }));
    await act(async () => result.current.downloadInvoice());
    expect(h.error).toHaveBeenCalledWith(fallbackT('mweb.checkout.errorInvoiceUnavailable'));
    const refused = setup(vi.fn().mockRejectedValue(new Error('No invoice yet')));
    await act(async () => refused.result.current.downloadInvoice());
    expect(h.error).toHaveBeenLastCalledWith('No invoice yet');
    expect(h.download).not.toHaveBeenCalled();
    const noData = setup(vi.fn().mockResolvedValue({ data: undefined }));
    await act(async () => noData.result.current.downloadInvoice());
    expect(h.error).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorInvoiceUnavailable'));
  });

  it('downloads the seller invoice under its own file name and mime type', async () => {
    const seller = vi.fn().mockResolvedValue({ data: { myProductOrderSellerInvoice: { filename: 'inv.pdf', mime: 'application/pdf', content_base64: 'QUJD' } } });
    const { result } = setup(vi.fn(), seller);
    await act(async () => result.current.downloadSellerInvoice());
    expect(seller).toHaveBeenCalledWith({ variables: { id: 'o1' } });
    expect(h.download).toHaveBeenCalledWith('QUJD', 'seller-inv.pdf', 'application/pdf');
  });

  it('says the download failed when the seller invoice has no content, or the request fails', async () => {
    const empty = setup(vi.fn(), vi.fn().mockResolvedValue({ data: { myProductOrderSellerInvoice: { filename: 'x', mime: 'x', content_base64: '' } } }));
    await act(async () => empty.result.current.downloadSellerInvoice());
    expect(h.error).toHaveBeenLastCalledWith(fallbackT('mweb.orderDetail.downloadFailed'));
    const noData = setup(vi.fn(), vi.fn().mockResolvedValue({ data: undefined }));
    await act(async () => noData.result.current.downloadSellerInvoice());
    expect(h.error).toHaveBeenLastCalledWith(fallbackT('mweb.orderDetail.downloadFailed'));
    const failing = setup(vi.fn(), vi.fn().mockRejectedValue(new Error('Courier unreachable')));
    await act(async () => failing.result.current.downloadSellerInvoice());
    expect(h.error).toHaveBeenLastCalledWith('Courier unreachable');
  });

  it('reports each document as busy while it loads', () => {
    const { result } = setup(vi.fn(), vi.fn(), { invoiceLoading: true, sellerLoading: true });
    expect(result.current.invoiceBusy).toBe(true);
    expect(result.current.sellerInvoiceBusy).toBe(true);
  });
});

describe('OrderDetailPage', () => {
  const page = (main: object, returns: object = { data: { myPodShopReturns: [] }, error: undefined, refetch: vi.fn().mockResolvedValue(undefined) }) => {
    h.invoiceHook.mockReset();
    h.useLazyQuery.mockReturnValue([vi.fn(), { loading: false }]);
    h.useMutation.mockReturnValue([vi.fn(), { loading: false }]);
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }) => ((doc.loc?.source.body ?? '').includes('myProductOrder') ? main : returns));
    return inRouter(<OrderDetailPage />);
  };
  const loaded = (o: object | null, refetch = vi.fn().mockResolvedValue(undefined)) => ({ data: { myProductOrder: o }, loading: false, error: undefined, refetch });

  it('shows a loading placeholder', () => {
    page({ data: undefined, loading: true, error: undefined, refetch: vi.fn() });
    expect(screen.getByTestId('order-detail-loading')).toBeInTheDocument();
  });

  it('shows the error with a retry that reloads both reads, and survives a failing reload', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('offline'));
    page({ data: undefined, loading: false, error: new Error('Orders down'), refetch });
    expect(screen.getByTestId('order-detail-error')).toHaveTextContent('Orders down');
    fireEvent.click(screen.getByTestId('order-detail-retry'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('says the order was not found and goes back to the orders list', () => {
    page(loaded(null));
    expect(screen.getByTestId('order-detail-not-found')).toHaveTextContent(fallbackT('mweb.orderDetail.notFoundBody'));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.orderDetail.backToOrders') }));
    expect(screen.getByTestId('where')).toHaveTextContent('/orders');
  });

  it('shows the order: summary with the pod, status and fulfilment, tracking, shipment, items and actions', () => {
    page(loaded(order()));
    expect(screen.getByTestId('order-number')).toHaveTextContent(fallbackT('mweb.orderDetail.orderNo', { vars: { orderNo: 'PO-77' } }));
    expect(screen.getByTestId('order-summary')).toHaveTextContent('Sunday Run');
    expect(screen.getByTestId('order-placed')).toHaveTextContent('at:2026-06-01T10:00:00.000Z');
    expect(screen.getByTestId('order-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('order-shipment')).toBeInTheDocument();
    expect(screen.getByTestId('order-items')).toBeInTheDocument();
    expect(screen.getByTestId('order-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('order-returns-error')).not.toBeInTheDocument();
  });

  it('omits the pod line for an order with no pod, and warns when the returns could not be read', () => {
    page(loaded(order({ pod: null })), { data: undefined, error: new Error('x'), refetch: vi.fn() });
    expect(screen.getByTestId('order-summary')).not.toHaveTextContent('Sunday Run');
    expect(screen.getByTestId('order-returns-error')).toBeInTheDocument();
  });

  it('gives the order its own returns, grouped by order id', () => {
    page(loaded(order()), { data: { myPodShopReturns: [{ id: 'r1', order_id: 'o1', product_order_id: 'o1' }] }, error: undefined, refetch: vi.fn().mockResolvedValue(undefined) });
    expect(screen.getByTestId('returns-section')).toBeInTheDocument();
  });

  it('opens the return and cancel-return dialogs, reloading both reads when they finish, and goes back to orders from the header', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const returnsRefetch = vi.fn().mockResolvedValue(undefined);
    page(loaded(order(), refetch), { data: { myPodShopReturns: [] }, error: undefined, refetch: returnsRefetch });
    fireEvent.click(screen.getByTestId('start-return'));
    fireEvent.click(screen.getByTestId('return-requested'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    expect(returnsRefetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('return-close'));
    expect(screen.queryByTestId('return-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-return'));
    fireEvent.click(screen.getByTestId('cancelled'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId('cancel-close'));
    expect(screen.queryByTestId('cancel-dialog')).not.toBeInTheDocument();
  });

  it('keeps the order on screen through a refresh or a failed one', () => {
    page({ ...loaded(order()), loading: true, error: new Error('x') });
    expect(screen.getByTestId('order-number')).toBeInTheDocument();
  });
});
