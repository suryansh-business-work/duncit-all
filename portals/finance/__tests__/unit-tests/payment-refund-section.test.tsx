import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { DateInput } from '@duncit/app-settings';
import RefundSection from '../../src/pages/finance/payment-detail-page/RefundSection';
import { renderWithProviders } from '../testkit';
import { completedRefundSection, makeRefundEntry, makeRefundSection } from '../mocks/payment-detail.mock';

const formatDateTime = (value: DateInput) => (typeof value === 'string' ? `on ${value}` : '');

type Sections = Parameters<typeof RefundSection>[0]['refunds'];

const mount = (refunds: Sections) =>
  renderWithProviders(
    <RefundSection paymentDocId="pd1" currencySymbol="₹" refunds={refunds} formatDateTime={formatDateTime} />,
    { initialEntries: ['/payment-logs/pd1'] },
  );

const header = (testId: string) => within(screen.getByTestId(testId)).getByRole('button', { name: /Information/ });

describe('RefundSection — when there is nothing to show', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty list', []],
  ] as const)('renders nothing for %s', (_label, refunds) => {
    mount(refunds);
    expect(screen.queryByTestId('payment-refund-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Refund' })).not.toBeInTheDocument();
  });
});

describe('RefundSection — one accordion per kind', () => {
  const everyKind = () => [
    makeRefundSection({ kind: 'COIN', state: 'COMPLETED', amount: 0, coins: 30, entries: [makeRefundEntry({ id: 'c1', source: 'LEDGER', status: 'CREDITED', state: 'COMPLETED', amount: 0, coins: 30, can_refund: false })] }),
    makeRefundSection({ kind: 'POD_PAYMENT' }),
    makeRefundSection({ kind: 'PAYMENT', entries: [makeRefundEntry({ id: 'p1' })] }),
    makeRefundSection({ kind: 'RENTAL', entries: [makeRefundEntry({ id: 'r1', source: 'RENTAL' })] }),
    completedRefundSection({ kind: 'POD_SHOP' }),
    completedRefundSection({ kind: 'ECOMM', entries: [makeRefundEntry({ id: 'e1', state: 'COMPLETED', status: 'RECORDED', can_refund: false })] }),
    makeRefundSection({ kind: 'FAILED_PAYMENT', entries: [makeRefundEntry({ id: 'f1', source: 'CASE', status: 'NOT_STARTED' })] }),
  ];

  it('titles every kind and keeps the order the server sent', () => {
    mount(everyKind());

    const titles = [
      ['payment-refund-coin', 'Coin Refund Information'],
      ['payment-refund-pod-payment', 'Pod Payment Refund Information'],
      ['payment-refund-payment', 'Payment Refund Information'],
      ['payment-refund-rental', 'Rented Items Refund Information'],
      ['payment-refund-pod-shop', 'Pod Shop Refund Information'],
      ['payment-refund-ecomm', 'E-commerce Order Refund Information'],
      ['payment-refund-failed-payment', 'Payment Failed Refund Information'],
    ];
    for (const [testId, title] of titles) {
      expect(within(screen.getByTestId(testId)).getByText(title)).toBeInTheDocument();
    }
    const order = screen.getAllByTestId(/^payment-refund-(?!section|to-source|events|entry)/).map((node) => node.getAttribute('data-testid'));
    expect(order).toEqual(titles.map(([testId]) => testId));
  });

  it('puts the heading and a count of each state above the accordions', () => {
    mount(everyKind());

    expect(screen.getByRole('heading', { level: 2, name: 'Refund' })).toBeInTheDocument();
    expect(screen.getByText('Pending: 4')).toBeInTheDocument();
    expect(screen.getByText('Completed: 3')).toBeInTheDocument();
    expect(screen.queryByText(/^Failed: /)).not.toBeInTheDocument();
  });

  it('shows the cash, the coins, both or neither as the accordion figure', () => {
    mount([
      makeRefundSection({ kind: 'COIN', state: 'COMPLETED', amount: 0, coins: 30 }),
      makeRefundSection({ kind: 'POD_PAYMENT', amount: 1000, coins: 0 }),
      makeRefundSection({ kind: 'POD_SHOP', state: 'COMPLETED', amount: 250, coins: 12 }),
      makeRefundSection({ kind: 'RENTAL', amount: 0, coins: 0 }),
    ]);

    expect(within(header('payment-refund-coin')).getByText('30 coins')).toBeInTheDocument();
    expect(within(header('payment-refund-pod-payment')).getByText('₹1000.00')).toBeInTheDocument();
    expect(within(header('payment-refund-pod-shop')).getByText('₹250.00 · 12 coins')).toBeInTheDocument();
    expect(within(header('payment-refund-rental')).queryByText(/₹|coins/)).not.toBeInTheDocument();
  });
});

describe('RefundSection — the state of a refund', () => {
  it('opens a pending refund, tints it and offers Refund only on a row the server marked sendable', () => {
    mount([
      makeRefundSection({
        entries: [
          makeRefundEntry({ id: 'a', ref: 'DUN-PAY-4821', can_refund: true }),
          makeRefundEntry({ id: 'b', ref: 'DUN-PAY-4822', status: 'PROCESSING', can_refund: false }),
        ],
      }),
    ]);

    const accordion = screen.getByTestId('payment-refund-pod-payment');
    expect(accordion).toHaveAttribute('data-state', 'PENDING');
    expect(header('payment-refund-pod-payment')).toHaveAttribute('aria-expanded', 'true');
    expect(within(accordion).getByText('Refund pending')).toBeInTheDocument();

    expect(within(accordion).getAllByRole('button', { name: /^Refund / })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Refund DUN-PAY-4821 to its original source' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund DUN-PAY-4822 to its original source' })).not.toBeInTheDocument();
    // The second row's own status says why it has no button.
    expect(within(accordion).getByText('Processing at Razorpay')).toBeInTheDocument();
  });

  it('folds a completed refund and offers no button, until it is opened', () => {
    mount([completedRefundSection()]);

    const accordion = screen.getByTestId('payment-refund-pod-shop');
    expect(accordion).toHaveAttribute('data-state', 'COMPLETED');
    expect(header('payment-refund-pod-shop')).toHaveAttribute('aria-expanded', 'false');
    expect(within(header('payment-refund-pod-shop')).getByText('Refunded')).toBeInTheDocument();

    fireEvent.click(header('payment-refund-pod-shop'));
    expect(header('payment-refund-pod-shop')).toHaveAttribute('aria-expanded', 'true');
    // The reference heads the row and is also its Reference line.
    expect(within(accordion).getAllByText('DUN-ORD-1001')).toHaveLength(2);
    expect(within(accordion).getByText('Order cancelled')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-refund-to-source')).not.toBeInTheDocument();
  });

  it('opens a failed refund with its error and the retry button', () => {
    mount([
      makeRefundSection({
        state: 'FAILED',
        entries: [
          makeRefundEntry({
            status: 'RECONCILIATION_REQUIRED',
            state: 'FAILED',
            error: 'No Razorpay payment id is recorded on this payment.',
            attempts: 5,
          }),
        ],
      }),
    ]);

    const accordion = screen.getByTestId('payment-refund-pod-payment');
    expect(accordion).toHaveAttribute('data-state', 'FAILED');
    expect(header('payment-refund-pod-payment')).toHaveAttribute('aria-expanded', 'true');
    expect(within(accordion).getByText('Refund failed')).toBeInTheDocument();
    expect(within(accordion).getByText('Needs reconciliation')).toBeInTheDocument();
    expect(within(accordion).getByText('No Razorpay payment id is recorded on this payment.')).toBeInTheDocument();
    expect(screen.getByText('Failed: 1')).toBeInTheDocument();
    expect(within(accordion).getByRole('button', { name: /^Refund / })).toBeInTheDocument();
  });

  it('says a held refund is held, and when it is released', () => {
    mount([
      makeRefundSection({
        entries: [
          makeRefundEntry({
            id: 'h1',
            source: 'HELD',
            status: 'HELD',
            razorpay_refund_id: null,
            razorpay_refund_ids: [],
            requested_at: null,
            due_at: '2026-09-20T06:30:00.000Z',
            can_refund: false,
          }),
        ],
      }),
    ]);

    expect(screen.getByText('Held until the pod starts')).toBeInTheDocument();
    expect(screen.getByText('Held cancellation refund')).toBeInTheDocument();
    expect(screen.getByText('on 2026-09-20T06:30:00.000Z')).toBeInTheDocument();
    expect(screen.queryByText('Requested')).not.toBeInTheDocument();
  });
});
