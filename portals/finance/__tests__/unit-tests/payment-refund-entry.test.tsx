import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { DateInput } from '@duncit/app-settings';
import RefundSection from '../../src/pages/finance/payment-detail-page/RefundSection';
import { renderWithProviders } from '../testkit';
import { makeRefundEntry, makeRefundEvent, makeRefundSection } from '../mocks/payment-detail.mock';

const formatDateTime = (value: DateInput) => (typeof value === 'string' ? `on ${value}` : '');

type Sections = Parameters<typeof RefundSection>[0]['refunds'];

const mount = (refunds: Sections) =>
  renderWithProviders(
    <RefundSection paymentDocId="pd1" currencySymbol="₹" refunds={refunds} formatDateTime={formatDateTime} />,
    { initialEntries: ['/payment-logs/pd1'] },
  );

describe('RefundSection — what an entry shows', () => {
  it('prints every line a refund carries, with every Razorpay id as a Payment Trace link', () => {
    mount([
      makeRefundSection({
        entries: [
          makeRefundEntry({
            ref: 'DUN-PAY-4821',
            source: 'POD_CANCELLATION',
            amount: 640.5,
            coins: 40,
            razorpay_refund_id: 'rfnd_Aa11',
            razorpay_refund_ids: ['rfnd_Aa11', 'rfnd_Bb22'],
            razorpay_payment_id: 'pay_Nx12Razor',
            initiated_by: 'SYSTEM',
            reason: 'Host cancelled the pod',
            error: 'Razorpay timed out',
            attempts: 3,
            requested_at: '2026-09-03T08:15:00.000Z',
            processed_at: '2026-09-03T08:20:00.000Z',
            due_at: '2026-09-04T08:20:00.000Z',
            can_refund: false,
          }),
        ],
      }),
    ]);

    const entry = screen.getByTestId('payment-refund-entry');
    const text = (label: string) => within(entry).getByText(label);
    expect(text('Pod cancellation')).toBeInTheDocument();
    expect(text('₹640.50')).toBeInTheDocument();
    expect(text('40')).toBeInTheDocument();
    expect(text('SYSTEM')).toBeInTheDocument();
    expect(text('Host cancelled the pod')).toBeInTheDocument();
    expect(text('Razorpay timed out')).toBeInTheDocument();
    expect(text('3')).toBeInTheDocument();
    expect(text('on 2026-09-03T08:15:00.000Z')).toBeInTheDocument();
    expect(text('on 2026-09-03T08:20:00.000Z')).toBeInTheDocument();
    expect(text('on 2026-09-04T08:20:00.000Z')).toBeInTheDocument();

    // Several refund ids: each on its own numbered line, each a trace link.
    expect(text('Razorpay refund 1')).toBeInTheDocument();
    expect(text('Razorpay refund 2')).toBeInTheDocument();
    const links = within(entry).getAllByTestId('payment-trace-link');
    expect(links.map((link) => link.textContent)).toEqual(['rfnd_Aa11', 'rfnd_Bb22', 'pay_Nx12Razor']);
    expect(links[1]).toHaveAttribute('href', '/payment-trace?ref=rfnd_Bb22');
    expect(links[2]).toHaveAttribute('href', '/payment-trace?ref=pay_Nx12Razor');
  });

  it('uses the primary refund id when the list is empty, and none when there is no id at all', () => {
    mount([
      makeRefundSection({
        entries: [
          makeRefundEntry({ id: 'x1', ref: 'ONE', razorpay_refund_id: 'rfnd_Only', razorpay_refund_ids: [], razorpay_payment_id: null, can_refund: false }),
          makeRefundEntry({ id: 'x2', ref: 'NONE', razorpay_refund_id: null, razorpay_refund_ids: [], razorpay_payment_id: null, can_refund: false }),
        ],
      }),
    ]);

    const [one, none] = screen.getAllByTestId('payment-refund-entry');
    expect(within(one).getByText('Razorpay refund')).toBeInTheDocument();
    expect(within(one).getByTestId('payment-trace-link')).toHaveTextContent('rfnd_Only');
    expect(within(none).queryByText('Razorpay refund')).not.toBeInTheDocument();
    expect(within(none).queryByTestId('payment-trace-link')).not.toBeInTheDocument();
  });

  it('names a row by its type when it has no reference, and shows an unknown value as it came', () => {
    mount([
      makeRefundSection({
        entries: [
          makeRefundEntry({
            ref: null,
            source: 'FUTURE_SOURCE',
            status: 'FUTURE_STATUS',
            amount: 0,
            coins: 0,
            initiated_by: null,
            reason: null,
            error: null,
            attempts: 0,
            requested_at: null,
            processed_at: null,
            due_at: null,
            razorpay_refund_id: null,
            razorpay_refund_ids: [],
            razorpay_payment_id: null,
            can_refund: false,
          }),
        ],
      }),
    ]);

    const entry = screen.getByTestId('payment-refund-entry');
    expect(within(entry).getByRole('heading', { level: 4, name: 'FUTURE_SOURCE' })).toBeInTheDocument();
    expect(within(entry).getByText('FUTURE_STATUS')).toBeInTheDocument();
    for (const absent of ['Reference', 'Amount', 'Duncit Coins', 'Started by', 'Reason', 'Last error', 'Attempts', 'Requested', 'Processed', 'Released on']) {
      expect(within(entry).queryByText(absent)).not.toBeInTheDocument();
    }
  });
});

describe('RefundSection — activity', () => {
  it('lists the kind’s events oldest first with who did it and the note', () => {
    mount([
      makeRefundSection({
        events: [
          makeRefundEvent({ id: 'ev1', type: 'REFUND_REQUESTED', actor_name: 'Meera Finance' }),
          makeRefundEvent({ id: 'ev2', type: 'REFUND_PROCESSED', source: 'WEBHOOK', actor_name: null, details: [] }),
        ],
      }),
    ]);

    const events = screen.getByTestId('payment-refund-events');
    expect(within(events).getByRole('heading', { level: 4, name: 'Activity' })).toBeInTheDocument();
    const rows = within(events).getAllByTestId('failed-payment-event');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('REFUND_REQUESTED')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Meera Finance')).toBeInTheDocument();
    expect(within(rows[0]).getByText('note: Customer waited three days')).toBeInTheDocument();
    expect(within(rows[1]).getByText('REFUND_PROCESSED')).toBeInTheDocument();
  });

  it('leaves the activity heading out when the kind has no events yet', () => {
    mount([makeRefundSection({ events: [] })]);
    expect(screen.queryByTestId('payment-refund-events')).not.toBeInTheDocument();
    expect(screen.queryByText('Activity')).not.toBeInTheDocument();
  });
});
