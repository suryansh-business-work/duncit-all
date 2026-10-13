import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { bookedOrder, orderRow, shiprocket } from './__tests__/fixtures';
import { mountOrder, orderAnswer, openedOrder } from './__tests__/mount';
import type { SentOperation } from '../../../__tests__/groupC-link';

afterEach(cleanup);

const GET = 'PartnerBrandProductOrder';

describe('OrderDetailPage states', () => {
  it('shows a spinner while the order loads', () => {
    mountOrder({ [GET]: orderAnswer(orderRow()) });
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('order-detail')).toBeNull();
  });

  it('warns when the order is not on the partner’s brands', async () => {
    mountOrder({ [GET]: orderAnswer(null) });
    expect(await screen.findByText('This order was not found on your brands.')).toBeTruthy();
    expect(screen.queryByTestId('order-detail')).toBeNull();
  });

  it('shows the server error and reloads on Try again', async () => {
    const sent: SentOperation[] = [];
    mountOrder({ [GET]: new Error('Orders are unavailable') }, sent);
    expect(await screen.findByText('Orders are unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(sent.filter((op) => op.name === GET).length).toBeGreaterThan(1));
  });

  it('asks for the order by the id in the URL', async () => {
    const sent: SentOperation[] = [];
    mountOrder({ [GET]: orderAnswer(orderRow()) }, sent);
    await openedOrder();
    expect(sent[0]).toMatchObject({ name: GET, variables: { id: 'o1' } });
  });
});

describe('OrderDetailPage content', () => {
  it('shows an unbooked shipment with its ship-to, items and the first actions only', async () => {
    mountOrder({ [GET]: orderAnswer(orderRow()) });
    await openedOrder();
    expect(screen.getByText('Order ORD-1001')).toBeTruthy();
    expect(screen.getByText('The shipment is not booked with ShipRocket yet.')).toBeTruthy();
    expect(screen.getByText('4 Lake Road, Block B, Near park')).toBeTruthy();
    expect(screen.getByText('Bengaluru, Karnataka, 560001, India')).toBeTruthy();
    expect(screen.getByText('Pet Collar · Large')).toBeTruthy();
    expect(screen.getByText('Leash')).toBeTruthy();
    expect(screen.getByTestId('order-book').textContent).toBe('Book shipment');
    expect(screen.getByTestId('order-edit-address')).toBeTruthy();
    expect(screen.getByTestId('order-cancel')).toBeTruthy();
    // No AWB yet: nothing to refresh, print or track.
    expect(screen.queryByTestId('order-refresh-tracking')).toBeNull();
    expect(screen.queryByText('Label')).toBeNull();
    expect(screen.queryByText('Track this shipment')).toBeNull();
  });

  it('labels a failed booking as a retry and shows why it stopped', async () => {
    mountOrder({ [GET]: orderAnswer(orderRow({ last_error: 'Pincode not serviceable' })) });
    await openedOrder();
    expect(screen.getByTestId('order-last-error').textContent).toContain('Pincode not serviceable');
    expect(screen.getByTestId('order-book').textContent).toBe('Retry booking');
    expect(screen.queryByText('The shipment is not booked with ShipRocket yet.')).toBeNull();
  });

  it('shows the courier facts, tracking links, scans and the papers of a booked shipment', async () => {
    mountOrder({ [GET]: orderAnswer(bookedOrder()) });
    await openedOrder();
    expect(screen.getByText('BlueDart')).toBeTruthy();
    expect(screen.getByText('AWB123')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Track this shipment' }).getAttribute('href')).toContain('AWB123');
    expect(screen.getByRole('link', { name: /Open in ShipRocket/ }).getAttribute('href')).toContain('SR-77');
    expect(screen.getByRole('list', { name: 'Courier scans' }).textContent).toContain('Bengaluru hub');
    for (const doc of ['Label', 'Invoice', 'Manifest']) {
      expect(within(screen.getByRole('group', { name: doc })).getByRole('button', { name: 'Print' })).toBeTruthy();
    }
    expect(screen.getByTestId('order-refresh-tracking')).toBeTruthy();
    // Shipped orders are past the point a brand can call them off or fix the address.
    expect(screen.queryByTestId('order-cancel')).toBeNull();
    expect(screen.queryByTestId('order-edit-address')).toBeNull();
    expect(screen.queryByTestId('order-book')).toBeNull();
  });

  it('flags a sandbox booking as a test order', async () => {
    mountOrder({ [GET]: orderAnswer(bookedOrder({ shiprocket: shiprocket({ sandbox: true, awb: 'A1', order_id: 'S1' }) })) });
    expect((await screen.findByTestId('order-sandbox-chip')).textContent).toBe('Sandbox — test order');
  });

  it('leaves out the courier and ship-to sections of a pickup order', async () => {
    mountOrder({
      [GET]: orderAnswer(orderRow({ fulfilment_method: 'PICKUP', fulfilment_status: 'READY_FOR_PICKUP' })),
    });
    await openedOrder();
    expect(screen.queryByText('Shipment')).toBeNull();
    expect(screen.queryByText('Ship to')).toBeNull();
    expect(screen.getByTestId('order-cancel')).toBeTruthy();
    expect(screen.queryByTestId('order-book')).toBeNull();
  });

  it('shows a cancelled order read-only with the refund story', async () => {
    mountOrder({
      [GET]: orderAnswer(
        orderRow({
          fulfilment_status: 'CANCELLED',
          cancelled_at: '2026-07-03T08:00:00.000Z',
          cancel_reason: 'Out of stock',
          deletion_request_no: 'DR-9',
          refund: { ...orderRow().refund, status: 'FAILED', amount: 450, coins: 20, error: 'Bank rejected' },
        }),
      ),
    });
    await openedOrder();
    const story = within(screen.getByTestId('order-cancellation'));
    expect(story.getByText('Out of stock')).toBeTruthy();
    expect(story.getByText('DR-9')).toBeTruthy();
    expect(story.getByText('Refund failed — Duncit Finance will pay it out')).toBeTruthy();
    expect(story.getByText(/450\.00/)).toBeTruthy();
    expect(story.getByText(/Refund problem: Bank rejected/)).toBeTruthy();
    expect(screen.queryByTestId('order-cancel')).toBeNull();
    expect(screen.queryByTestId('order-book')).toBeNull();
  });
});
