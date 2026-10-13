import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { mountReturns, openReturn, returnRow } from './__tests__/fixtures';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const refunded = returnRow({
  id: 'r2',
  return_no: 'RET-2',
  buyer_name: 'Sana Khan',
  status: 'REFUNDED',
  gross: 250,
  items: [returnRow().items[0]],
  decision_note: 'Looks fine',
  pickup: { ...returnRow().pickup, awb: 'AWB77', courier_name: 'BlueDart', status: 'DELIVERED', tracking_status: 'Delivered' },
  refund: { ...returnRow().refund, status: 'PROCESSED', amount: 250, coins: 15 },
  events: [
    { __typename: 'PodShopReturnEvent', status: 'REQUESTED', note: '', by: 'Sana', at: '2026-07-01T10:00:00.000Z' },
    { __typename: 'PodShopReturnEvent', status: 'REFUNDED', note: 'Refund done', by: 'Brand', at: '2026-07-05T10:00:00.000Z' },
  ],
});

const rowOf = async (text: string) => (await screen.findByText(text)).closest('[role="row"]') as HTMLElement;

describe('ReturnsPage table', () => {
  it('lists the returns with items, value and status', async () => {
    mountReturns([returnRow(), refunded]);
    const first = within(await rowOf('RET-1'));
    expect(first.getByText('ORD-1001')).toBeTruthy();
    expect(first.getByText('Pet Collar × 2 +1')).toBeTruthy();
    expect(first.getByText(/600\.00/)).toBeTruthy();
    expect(first.getByText('Requested')).toBeTruthy();
    expect(within(await rowOf('RET-2')).getByText('Refunded')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    mountReturns([]);
    expect(await screen.findByText('No returns yet.')).toBeTruthy();
  });
});

describe('ReturnDetailDrawer', () => {
  it('opens a requested return with its items, reason and the decision buttons', async () => {
    mountReturns([returnRow()]);
    const detail = within(await openReturn('RET-1'));
    expect(detail.getByText('Return RET-1')).toBeTruthy();
    expect(detail.getByText(/Order ORD-1001 · Meera Iyer/)).toBeTruthy();
    expect(detail.getByText('Pet Collar · Large')).toBeTruthy();
    expect(detail.getByText('Wrong size')).toBeTruthy();
    expect(detail.getByText('Too tight on my dog')).toBeTruthy();
    expect(detail.getByTestId('return-approve')).toBeTruthy();
    expect(detail.getByTestId('return-reject')).toBeTruthy();
    expect(detail.queryByTestId('return-refund')).toBeNull();
    expect(detail.getByRole('list', { name: 'History' }).textContent).toContain('Buyer asked — Meera');
  });

  it('shows the pickup and refund of a refunded return and no actions', async () => {
    mountReturns([refunded]);
    const detail = within(await openReturn('RET-2'));
    expect(detail.getByText('AWB77')).toBeTruthy();
    expect(detail.getByText('BlueDart')).toBeTruthy();
    expect(detail.getByText('Delivered to you')).toBeTruthy();
    expect(detail.getByText('Looks fine')).toBeTruthy();
    expect(detail.getByText('15')).toBeTruthy();
    expect(detail.queryByTestId('return-approve')).toBeNull();
    expect(detail.queryByTestId('return-refund')).toBeNull();
    expect(detail.queryByTestId('return-retry-refund')).toBeNull();
  });

  it('shows why a pickup booking and a refund failed', async () => {
    mountReturns([
      returnRow({
        status: 'APPROVED',
        pickup: { ...returnRow().pickup, status: 'FAILED', last_error: 'Pincode blocked' },
        refund: { ...returnRow().refund, status: 'FAILED', amount: 600, error: 'Bank refused' },
      }),
    ]);
    const detail = within(await openReturn('RET-1'));
    expect(detail.getByText('ShipRocket could not book the pickup: Pincode blocked')).toBeTruthy();
    expect(detail.getByText('Bank refused')).toBeTruthy();
    expect(detail.getByTestId('return-retry-pickup')).toBeTruthy();
    expect(detail.getByTestId('return-retry-refund')).toBeTruthy();
  });

  it('closes from the close button', async () => {
    mountReturns([returnRow()]);
    await openReturn('RET-1');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('return-detail')).toBeNull());
  });
});
