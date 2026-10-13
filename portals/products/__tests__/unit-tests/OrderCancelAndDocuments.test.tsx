import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { downloadBase64File, printBase64File } from '@duncit/utils';
import OrderCancelRefundCard, { type CancelRefundOrder } from '../../src/pages/orders/OrderCancelRefundCard';
import OrderShipmentDocuments from '../../src/pages/orders/OrderShipmentDocuments';
import OrderShipmentSection from '../../src/pages/orders/OrderShipmentSection';

const m = vi.hoisted(() => ({
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  loading: {} as Record<string, boolean>,
}));

vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useMutation: (doc: { definitions: { name: { value: string } }[] }) => {
    const name = doc.definitions[0].name.value;
    return [m.mutations[name], { loading: m.loading[name] ?? false }];
  },
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@duncit/utils', async (io) => ({
  ...(await io<typeof import('@duncit/utils')>()),
  printBase64File: vi.fn(),
  downloadBase64File: vi.fn(),
}));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (v: string) => `DT:${v}` }),
}));

const makeOrder = (over: Partial<CancelRefundOrder> = {}): CancelRefundOrder => ({
  id: 'o1',
  channel: 'POD_SHOP',
  fulfilment_status: 'PACKED',
  currency_symbol: '₹',
  total: 1250,
  cancelled_at: null,
  cancel_reason: '',
  cancelled_by: '',
  shiprocket: { awb: '' },
  refund: { status: 'NONE', amount: 0, coins: 0, razorpay_refund_id: '', refunded_at: null, error: '' },
  ...over,
});

beforeEach(() => {
  m.mutations = {
    ForceCancelProductOrder: vi.fn().mockResolvedValue({}),
    RetryProductOrderRefund: vi.fn().mockResolvedValue({}),
    ProductOrderShipmentFile: vi.fn(),
  };
  m.loading = {};
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
  vi.mocked(printBase64File).mockClear();
  vi.mocked(downloadBase64File).mockClear();
});

describe('OrderCancelRefundCard', () => {
  it('renders nothing for pet-store orders', () => {
    render(<OrderCancelRefundCard order={makeOrder({ channel: 'PET_STORE' })} />);
    expect(screen.queryByTestId('order-cancel-refund')).not.toBeInTheDocument();
  });

  it('offers a cancel for an open order with the amount in the hint', () => {
    render(<OrderCancelRefundCard order={makeOrder()} />);
    expect(screen.getByText(/refunds the buyer ₹1,250.00 in full/)).toBeInTheDocument();
    expect(screen.getByTestId('order-force-cancel')).toBeEnabled();
  });

  it.each(['DELIVERED', 'PICKED_UP', 'CANCELLED', 'RTO_DELIVERED'])('disables cancel once the order is %s', (status) => {
    render(<OrderCancelRefundCard order={makeOrder({ fulfilment_status: status })} />);
    expect(screen.getByTestId('order-force-cancel')).toBeDisabled();
  });

  it('requires a reason, then cancels with the trimmed reason and closes', async () => {
    render(<OrderCancelRefundCard order={makeOrder()} />);
    fireEvent.click(screen.getByTestId('order-force-cancel'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/already with the courier/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    expect(await screen.findByText('Write the reason — the buyer is told it.')).toBeInTheDocument();
    expect(m.mutations.ForceCancelProductOrder).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: '  Out of stock  ' } });
    expect(screen.queryByText('Write the reason — the buyer is told it.')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Order cancelled — the refund is on its way.'));
    expect(m.mutations.ForceCancelProductOrder).toHaveBeenCalledWith({ variables: { id: 'o1', reason: 'Out of stock' } });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('warns that a parcel in transit may not be stoppable, with a dash when the AWB is unknown', async () => {
    const { unmount } = render(
      <OrderCancelRefundCard order={makeOrder({ fulfilment_status: 'SHIPPED', shiprocket: { awb: 'AWB77' } })} />,
    );
    fireEvent.click(screen.getByTestId('order-force-cancel'));
    expect(await screen.findByText(/AWB AWB77/)).toBeInTheDocument();
    unmount();
    render(<OrderCancelRefundCard order={makeOrder({ fulfilment_status: 'NDR', shiprocket: { awb: '' } })} />);
    fireEvent.click(screen.getByTestId('order-force-cancel'));
    expect(await screen.findByText(/AWB —/)).toBeInTheDocument();
  });

  it('keeps the dialog open and reports when the cancel fails', async () => {
    m.mutations.ForceCancelProductOrder = vi.fn().mockRejectedValueOnce(new Error('Courier refused')).mockRejectedValueOnce('x');
    render(<OrderCancelRefundCard order={makeOrder()} />);
    fireEvent.click(screen.getByTestId('order-force-cancel'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Damaged' } });
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Courier refused'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Action failed'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('closes the dialog from Cancel without cancelling', async () => {
    render(<OrderCancelRefundCard order={makeOrder()} />);
    fireEvent.click(screen.getByTestId('order-force-cancel'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(m.mutations.ForceCancelProductOrder).not.toHaveBeenCalled();
  });

  it('shows a processed refund with its Razorpay reference', () => {
    render(
      <OrderCancelRefundCard
        order={makeOrder({
          cancelled_at: '2026-10-05',
          cancelled_by: 'Support Sam',
          cancel_reason: 'Buyer asked',
          refund: { status: 'PROCESSED', amount: 1250, coins: 40, razorpay_refund_id: 'rfnd_77', refunded_at: '2026-10-06', error: '' },
        })}
      />,
    );
    expect(screen.getByText('Cancelled DT:2026-10-05 by Support Sam.')).toBeInTheDocument();
    expect(screen.getByText('Buyer asked')).toBeInTheDocument();
    expect(screen.getByText('₹1,250.00 back to the original payment · 40 coins')).toBeInTheDocument();
    expect(screen.getByText('Razorpay refund rfnd_77')).toBeInTheDocument();
    expect(screen.queryByTestId('order-force-cancel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry refund' })).not.toBeInTheDocument();
  });

  it('omits refund details when nothing was refunded and a dash for an unknown canceller', () => {
    render(<OrderCancelRefundCard order={makeOrder({ cancelled_at: '2026-10-05', cancelled_by: '' })} />);
    expect(screen.getByText('Cancelled DT:2026-10-05 by —.')).toBeInTheDocument();
    expect(screen.queryByText(/back to the original payment/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Razorpay refund/)).not.toBeInTheDocument();
  });

  it('retries a failed refund and reports the outcome', async () => {
    m.mutations.RetryProductOrderRefund = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Still refused'));
    render(
      <OrderCancelRefundCard
        order={makeOrder({
          cancelled_at: '2026-10-05',
          refund: { status: 'FAILED', amount: 1250, coins: 0, razorpay_refund_id: '', refunded_at: null, error: 'Insufficient balance' },
        })}
      />,
    );
    expect(screen.getByText(/Razorpay refused the refund: Insufficient balance/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry refund' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Refund sent to Razorpay again.'));
    expect(m.mutations.RetryProductOrderRefund).toHaveBeenCalledWith({ variables: { id: 'o1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry refund' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Still refused'));
  });

  it('uses the generic message when a refund retry fails without an Error', async () => {
    m.mutations.RetryProductOrderRefund = vi.fn().mockRejectedValue('boom');
    render(
      <OrderCancelRefundCard
        order={makeOrder({
          cancelled_at: '2026-10-05',
          refund: { status: 'FAILED', amount: 10, coins: 0, razorpay_refund_id: '', refunded_at: null, error: 'x' },
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry refund' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Action failed'));
  });
});

describe('OrderShipmentDocuments', () => {
  const file = { filename: 'ORD-1-label.pdf', mime: 'application/pdf', content_base64: 'QUJD' };

  it('disables label and manifest until a courier is assigned and says why', () => {
    render(<OrderShipmentDocuments orderId="o1" hasAwb={false} />);
    const label = screen.getByRole('group', { name: 'Label' });
    const invoice = screen.getByRole('group', { name: 'Invoice' });
    const manifest = screen.getByRole('group', { name: 'Manifest' });
    expect(within(label).getByRole('button', { name: 'Print' })).toBeDisabled();
    expect(within(manifest).getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(within(invoice).getByRole('button', { name: 'Print' })).toBeEnabled();
    expect(screen.getByText(/ready once a courier is assigned/)).toBeInTheDocument();
  });

  it('prints a document in place', async () => {
    m.mutations.ProductOrderShipmentFile.mockResolvedValue({ data: { productOrderShipmentFile: file } });
    render(<OrderShipmentDocuments orderId="o1" hasAwb />);
    expect(screen.queryByText(/ready once a courier is assigned/)).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Label' })).getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(printBase64File).toHaveBeenCalledWith('QUJD', 'application/pdf', 'ORD-1-label.pdf'));
    expect(m.mutations.ProductOrderShipmentFile).toHaveBeenCalledWith({ variables: { ids: ['o1'], kind: 'LABEL' } });
    expect(notifySuccess).toHaveBeenCalledWith('Opening the print dialog');
    expect(downloadBase64File).not.toHaveBeenCalled();
  });

  it('downloads a document under its filename', async () => {
    m.mutations.ProductOrderShipmentFile.mockResolvedValue({ data: { productOrderShipmentFile: file } });
    render(<OrderShipmentDocuments orderId="o1" hasAwb />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Manifest' })).getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(downloadBase64File).toHaveBeenCalledWith('QUJD', 'ORD-1-label.pdf', 'application/pdf'));
    expect(m.mutations.ProductOrderShipmentFile).toHaveBeenCalledWith({ variables: { ids: ['o1'], kind: 'MANIFEST' } });
    expect(notifySuccess).toHaveBeenCalledWith('Document downloaded');
    expect(printBase64File).not.toHaveBeenCalled();
  });

  it('tells the operator when ShipRocket returned no document', async () => {
    m.mutations.ProductOrderShipmentFile.mockResolvedValue({ data: { productOrderShipmentFile: null } });
    render(<OrderShipmentDocuments orderId="o1" hasAwb />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Invoice' })).getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('ShipRocket did not return the document'));
    expect(downloadBase64File).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('reports a failed fetch', async () => {
    m.mutations.ProductOrderShipmentFile.mockRejectedValue(new Error('Gateway timeout'));
    render(<OrderShipmentDocuments orderId="o1" hasAwb />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Invoice' })).getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(printBase64File).not.toHaveBeenCalled();
  });

  it('disables every button while a document is being fetched', () => {
    m.loading = { ProductOrderShipmentFile: true };
    render(<OrderShipmentDocuments orderId="o1" hasAwb />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});

describe('OrderShipmentSection', () => {
  const baseOrder = { id: 'o1' };
  const renderSection = (order: Parameters<typeof OrderShipmentSection>[0]['order'], busy = false) => {
    const onCreateShipment = vi.fn();
    const onRefreshTracking = vi.fn();
    render(<OrderShipmentSection order={order} busy={busy} onCreateShipment={onCreateShipment} onRefreshTracking={onRefreshTracking} />);
    return { onCreateShipment, onRefreshTracking };
  };

  it('offers to book an unbooked order and cannot sync yet', () => {
    const { onCreateShipment } = renderSection(baseOrder);
    expect(screen.getByText('No shipment created yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create shipment' }));
    expect(onCreateShipment).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sync tracking' })).toBeDisabled();
    expect(screen.queryByRole('group', { name: 'Label' })).not.toBeInTheDocument();
  });

  it('shows courier, tracking and the pickup location of a booked parcel', () => {
    const { onRefreshTracking } = renderSection({
      id: 'o1',
      pickup_location_id: 'Main Warehouse',
      shiprocket: { shipment_id: 's1', awb: 'AWB1', courier_name: 'Delhivery', tracking_status: 'In transit' },
    });
    expect(screen.getByText('Delhivery')).toBeInTheDocument();
    expect(screen.getByText('In transit')).toBeInTheDocument();
    expect(screen.getByText('Pickup from Main Warehouse')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /shipment|booking/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sync tracking' }));
    expect(onRefreshTracking).toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Label' })).toBeInTheDocument();
  });

  it('falls back to pending texts and offers a retry for a booking without an AWB', () => {
    renderSection({ id: 'o1', shiprocket: { shipment_id: 's1' } });
    expect(screen.getByText('Courier pending')).toBeInTheDocument();
    expect(screen.getByText('Awaiting first scan')).toBeInTheDocument();
    expect(screen.queryByText(/Pickup from/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry booking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync tracking' })).toBeEnabled();
  });

  it('dates the last booking error when the vendor was reached, and shows it bare otherwise', () => {
    const first = render(
      <OrderShipmentSection
        order={{ id: 'o1', last_error: 'Pincode unserviceable', shiprocket: { last_synced_at: '2026-10-05' } }}
        busy={false}
        onCreateShipment={vi.fn()}
        onRefreshTracking={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Last booking attempt (DT:2026-10-05): Pincode unserviceable');
    expect(screen.getByRole('alert')).toHaveTextContent('Pincode unserviceable');
    first.unmount();
    render(
      <OrderShipmentSection order={{ id: 'o1', last_error: 'Pincode unserviceable' }} busy={false} onCreateShipment={vi.fn()} onRefreshTracking={vi.fn()} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/^Pincode unserviceable$/);
  });

  it('shows no error banner for a synced order without a booking error', () => {
    renderSection({ id: 'o1', shiprocket: { shipment_id: 's1', last_synced_at: '2026-10-05' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables the actions while busy', () => {
    renderSection({ id: 'o1', shiprocket: { shipment_id: 's1' } }, true);
    expect(screen.getByRole('button', { name: 'Retry booking' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sync tracking' })).toBeDisabled();
  });
});
