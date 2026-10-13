import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { bookedOrder, orderRow } from './__tests__/fixtures';
import { mountOrder, orderAnswer, openedOrder } from './__tests__/mount';
import type { SentOperation } from '../../../__tests__/groupC-link';
import { recordNotices } from '../../../__tests__/groupC-notices';

const GET = 'PartnerBrandProductOrder';
let notices: ReturnType<typeof recordNotices>;

beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});

const messages = () => notices.notices.map((n) => n.message);

describe('order shipment actions', () => {
  it('books the shipment, says so, and swaps in the booked order', async () => {
    const sent: SentOperation[] = [];
    mountOrder(
      { [GET]: orderAnswer(orderRow()), PartnerBookProductOrderShipment: { brandBookProductOrderShipment: bookedOrder({ fulfilment_status: 'AWB_ASSIGNED' }) } },
      sent,
    );
    await openedOrder();
    fireEvent.click(screen.getByTestId('order-book'));

    await waitFor(() => expect(messages()).toContain('Shipment booked with ShipRocket.'));
    expect(sent.find((op) => op.name === 'PartnerBookProductOrderShipment')?.variables).toEqual({ id: 'o1' });
    expect(await screen.findByText('AWB123')).toBeTruthy();
    expect(screen.queryByTestId('order-book')).toBeNull();
  });

  it('reports a booking ShipRocket stopped part-way as an error, not a success', async () => {
    mountOrder({
      [GET]: orderAnswer(orderRow()),
      PartnerBookProductOrderShipment: { brandBookProductOrderShipment: orderRow({ last_error: 'Weight missing' }) },
    });
    await openedOrder();
    fireEvent.click(screen.getByTestId('order-book'));

    await waitFor(() => expect(messages()).toContain('ShipRocket could not book the shipment: Weight missing'));
    expect(messages()).not.toContain('Shipment booked with ShipRocket.');
    expect(await screen.findByTestId('order-book')).toBeTruthy();
  });

  it('shows the server message when booking is rejected', async () => {
    mountOrder({ [GET]: orderAnswer(orderRow()), PartnerBookProductOrderShipment: new Error('ShipRocket is down') });
    await openedOrder();
    fireEvent.click(screen.getByTestId('order-book'));
    await waitFor(() => expect(messages()).toContain('ShipRocket is down'));
  });

  it('refreshes tracking and shows the newest status', async () => {
    mountOrder({
      [GET]: orderAnswer(bookedOrder()),
      PartnerRefreshProductOrderTracking: {
        brandRefreshProductOrderTracking: bookedOrder({ fulfilment_status: 'OUT_FOR_DELIVERY', shiprocket: { ...bookedOrder().shiprocket, tracking_status: 'Out for delivery' } }),
      },
    });
    await openedOrder();
    fireEvent.click(screen.getByTestId('order-refresh-tracking'));
    await waitFor(() => expect(messages()).toContain('Tracking updated.'));
    await waitFor(() => expect(screen.getByText('Tracking:').parentElement?.textContent).toContain('Out for delivery'));
  });
});

describe('order address fix', () => {
  const openForm = async () => {
    fireEvent.click(screen.getByTestId('order-edit-address'));
    return screen.findByTestId('order-address-form');
  };

  it('prefills the ship-to, sends the corrected address and closes', async () => {
    const sent: SentOperation[] = [];
    mountOrder(
      {
        [GET]: orderAnswer(orderRow()),
        PartnerUpdateProductOrderAddress: { brandUpdateProductOrderAddress: orderRow({ shipping_address: { ...orderRow().shipping_address, line1: '9 New Street' } }) },
      },
      sent,
    );
    await openedOrder();
    const form = within(await openForm());
    expect((form.getByLabelText(/Address line 1/) as HTMLInputElement).value).toBe('4 Lake Road');
    fireEvent.change(form.getByLabelText(/Address line 1/), { target: { value: '9 New Street' } });
    fireEvent.click(form.getByTestId('order-address-submit'));

    await waitFor(() => expect(messages()).toContain('Delivery address updated.'));
    const op = sent.find((o) => o.name === 'PartnerUpdateProductOrderAddress');
    expect(op?.variables).toMatchObject({ id: 'o1', address: { line1: '9 New Street', pincode: '560001', email: 'meera@example.com' } });
    await waitFor(() => expect(screen.queryByTestId('order-address-form')).toBeNull());
    expect(await screen.findByText(/9 New Street/)).toBeTruthy();
  });

  it('refuses an invalid pincode without calling the server', async () => {
    const sent: SentOperation[] = [];
    mountOrder({ [GET]: orderAnswer(orderRow()) }, sent);
    await openedOrder();
    const form = within(await openForm());
    fireEvent.change(form.getByLabelText(/Pincode/), { target: { value: '12' } });
    fireEvent.click(form.getByTestId('order-address-submit'));

    await waitFor(() => expect(screen.getByTestId('order-address-form').textContent).toMatch(/pincode/i));
    expect(sent.some((op) => op.name === 'PartnerUpdateProductOrderAddress')).toBe(false);
  });

  it('keeps the form open when the server refuses the address', async () => {
    mountOrder({ [GET]: orderAnswer(orderRow()), PartnerUpdateProductOrderAddress: new Error('Already with the courier') });
    await openedOrder();
    const form = within(await openForm());
    fireEvent.click(form.getByTestId('order-address-submit'));
    await waitFor(() => expect(messages()).toContain('Already with the courier'));
    expect(screen.getByTestId('order-address-form')).toBeTruthy();
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('order-address-form')).toBeNull());
  });
});

describe('order cancellation', () => {
  const openCancel = async () => {
    fireEvent.click(screen.getByTestId('order-cancel'));
    return screen.findByTestId('order-cancel-form');
  };

  it('tells the brand what cancelling does and insists on a reason', async () => {
    const sent: SentOperation[] = [];
    mountOrder({ [GET]: orderAnswer(orderRow()) }, sent);
    await openedOrder();
    const form = within(await openCancel());
    expect(form.getByText(/Meera Iyer is refunded/)).toBeTruthy();
    fireEvent.click(form.getByTestId('order-cancel-confirm'));
    expect(await form.findByText('Give the reason — the buyer is told it.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'PartnerCancelProductOrder')).toBe(false);
  });

  it('cancels with the typed reason and shows the refund that started', async () => {
    const sent: SentOperation[] = [];
    mountOrder(
      {
        [GET]: orderAnswer(orderRow()),
        PartnerCancelProductOrder: {
          brandCancelProductOrder: orderRow({
            fulfilment_status: 'CANCELLED',
            cancelled_at: '2026-07-03T08:00:00.000Z',
            cancel_reason: 'Out of stock',
            refund: { ...orderRow().refund, status: 'PENDING', amount: 600 },
          }),
        },
      },
      sent,
    );
    await openedOrder();
    const form = within(await openCancel());
    fireEvent.change(form.getByTestId('order-cancel-reason').querySelector('textarea') as HTMLTextAreaElement, {
      target: { value: '  Out of stock  ' },
    });
    fireEvent.click(form.getByTestId('order-cancel-confirm'));

    await waitFor(() => expect(messages()).toContain('Order cancelled. The buyer’s refund has started.'));
    expect(sent.find((op) => op.name === 'PartnerCancelProductOrder')?.variables).toEqual({ id: 'o1', reason: 'Out of stock' });
    expect(await screen.findByText('Refund started')).toBeTruthy();
    expect(screen.queryByTestId('order-cancel-form')).toBeNull();
  });

  it('stays open and reports when the server refuses the cancellation', async () => {
    mountOrder({ [GET]: orderAnswer(orderRow()), PartnerCancelProductOrder: new Error('Courier already has it') });
    await openedOrder();
    const form = within(await openCancel());
    fireEvent.change(form.getByTestId('order-cancel-reason').querySelector('textarea') as HTMLTextAreaElement, {
      target: { value: 'Damaged' },
    });
    fireEvent.click(form.getByTestId('order-cancel-confirm'));
    await waitFor(() => expect(messages()).toContain('Courier already has it'));
    expect(screen.getByTestId('order-cancel-form')).toBeTruthy();
  });
});
