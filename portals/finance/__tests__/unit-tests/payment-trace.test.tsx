/**
 * Finance › Payment Trace: the id in the address bar, every payment and log it
 * appears in, ids that lead on to their own trace, and the empty states.
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type { PaymentTrace } from '@duncit/gql-types';
import { PaymentTracePage } from '../../src/pages/finance';
import { PAYMENT_TRACE } from '../../src/pages/finance/payment-trace-page/queries';
import { isTraceableId, paymentTracePath } from '../../src/lib/paymentTrace';
import { renderWithProviders } from '../testkit';

const AT = '2026-11-22T12:45:19.360Z';

const trace = (over: Partial<PaymentTrace> = {}): PaymentTrace => ({
  __typename: 'PaymentTrace',
  ref: 'pay_U39',
  found: true,
  payments: [
    {
      __typename: 'PaymentTracePayment',
      id: 'pd1',
      payment_id: 'DPAY-MWR1',
      invoice_no: null,
      source: 'POD_SHOP',
      status: 'FAILED',
      finalize_state: 'FAILED',
      amount: 9,
      currency_symbol: '₹',
      description: 'Shop cart',
      user_name: 'Ankush',
      razorpay_payment_id: 'pay_U39',
      razorpay_order_id: 'order_U39',
      razorpay_refund_ids: ['rfnd_1'],
      matched_on: ['RAZORPAY_PAYMENT'],
      created_at: AT,
      paid_at: null,
    },
  ],
  steps: [{ __typename: 'PaymentTraceStep', payment_id: 'DPAY-MWR1', key: 'ORDERS', status: 'FAILED', detail: 'Pod is full', at: AT }],
  events: [
    {
      __typename: 'PaymentTraceEvent',
      id: 'e1',
      payment_id: 'DPAY-MWR1',
      type: 'FINALIZE_FAILED',
      source: 'SERVER',
      actor_name: null,
      details: [{ __typename: 'PaymentEventDetail', key: 'razorpay_order_id', value: 'order_U39' }],
      created_at: AT,
    },
  ],
  webhooks: [
    {
      __typename: 'PaymentTraceWebhook',
      id: 'w1',
      event: 'payment.captured',
      razorpay_payment_id: 'pay_U39',
      razorpay_order_id: 'order_U39',
      razorpay_refund_id: null,
      status: 'captured',
      amount: 9,
      outcome: null,
      error: null,
      received_at: AT,
    },
  ],
  failed_cases: [
    { __typename: 'PaymentTraceFailedCase', id: 'fc1', payment_id: 'DPAY-MWR1', verification_status: 'PENDING', refund_status: 'NONE', resolution_state: 'OPEN', created_at: AT },
  ],
  gateway_refunds: [],
  shop_orders: [],
  food_orders: [],
  ...over,
});

const traceMock = (ref: string, data: PaymentTrace): MockedResponse => ({
  request: { query: PAYMENT_TRACE, variables: { ref } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { paymentTrace: data } },
});

const mount = (entry: string, mocks: readonly MockedResponse[]) =>
  renderWithProviders(<PaymentTracePage />, { path: '/payment-trace', entry, mocks });

describe('PaymentTracePage', () => {
  it('traces the id in the address bar: the payment, its checkout and match, and every log', async () => {
    mount('/payment-trace?ref=pay_U39', [traceMock('pay_U39', trace())]);

    const payment = within(await screen.findByTestId('payment-trace-payment'));
    expect(payment.getByText('Pod Shop cart')).toBeInTheDocument();
    expect(payment.getByText('Matched on Razorpay payment')).toBeInTheDocument();
    expect(payment.getByRole('link', { name: 'Trace order_U39' })).toHaveAttribute('href', '/payment-trace?ref=order_U39');
    expect(payment.getByRole('link', { name: 'Trace rfnd_1' })).toHaveAttribute('href', '/payment-trace?ref=rfnd_1');
    expect(payment.getByTestId('payment-trace-open-payment')).toHaveAttribute('href', '/payment-logs/pd1');

    expect(screen.getByTestId('payment-trace-steps')).toHaveTextContent('Checkout steps (1)');
    expect(screen.getByTestId('payment-trace-steps')).toHaveTextContent('Pod is full');
    expect(screen.getByTestId('payment-trace-events')).toHaveTextContent('Payment events (1)');
    expect(screen.getByTestId('payment-trace-webhooks')).toHaveTextContent('payment.captured');
    expect(within(screen.getByTestId('payment-trace-cases')).getByRole('link', { name: 'Open the case' })).toHaveAttribute('href', '/failed-payments/fc1');
    // A log the id is not in still shows, saying so.
    expect(screen.getByTestId('payment-trace-food')).toHaveTextContent('Venue food orders (0)');
    expect(screen.getByTestId('payment-trace-food')).toHaveTextContent('Not in this log.');
  });

  it('follows an id inside a log to its own trace', async () => {
    mount('/payment-trace?ref=pay_U39', [
      traceMock('pay_U39', trace()),
      traceMock('order_U39', trace({ ref: 'order_U39', payments: [{ ...trace().payments[0], matched_on: ['RAZORPAY_ORDER'] }] })),
    ]);
    const events = within(await screen.findByTestId('payment-trace-events'));
    fireEvent.click(events.getByRole('link', { name: 'Trace order_U39' }));
    expect(await screen.findByText('Matched on Razorpay order')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Payment, order, refund or invoice id' })).toHaveValue('order_U39');
  });

  it('traces a pasted id from the search field', async () => {
    mount('/payment-trace', [traceMock('DPAY-MWR1', trace({ ref: 'DPAY-MWR1' }))]);
    expect(screen.queryByTestId('payment-trace-results')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Payment, order, refund or invoice id' }), { target: { value: ' DPAY-MWR1 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trace' }));
    expect(await screen.findByTestId('payment-trace-results')).toBeInTheDocument();
  });

  it('says plainly when nothing carries the id', async () => {
    mount('/payment-trace?ref=DPAY-NOPE', [traceMock('DPAY-NOPE', trace({ ref: 'DPAY-NOPE', found: false, payments: [], steps: [], events: [], webhooks: [], failed_cases: [] }))]);
    expect(await screen.findByTestId('payment-trace-not-found')).toHaveTextContent('Nothing in Duncit carries “DPAY-NOPE”.');
  });

  it('explains an id found only in a log, with no payment of ours', async () => {
    mount('/payment-trace?ref=pay_V', [
      traceMock(
        'pay_V',
        trace({
          ref: 'pay_V',
          payments: [],
          steps: [],
          events: [],
          webhooks: [],
          failed_cases: [],
          food_orders: [
            {
              __typename: 'PaymentTraceFoodOrder',
              id: 'f1',
              order_no: 'FD-7',
              venue_name: 'Cafe Blue',
              status: 'SERVED',
              payment_status: 'PAID',
              amount: 250.5,
              currency_symbol: '₹',
              razorpay_payment_id: 'pay_V',
              razorpay_order_id: null,
              razorpay_refund_id: null,
              created_at: AT,
            },
          ],
        }),
      ),
    ]);
    expect(await screen.findByText('No Duncit payment carries this id; it appears only in the logs below.')).toBeInTheDocument();
    expect(screen.getByTestId('payment-trace-food')).toHaveTextContent('Cafe Blue');
  });

  it('shows the server refusal', async () => {
    mount('/payment-trace?ref=pay_X', [
      { request: { query: PAYMENT_TRACE, variables: { ref: 'pay_X' } }, result: { errors: [new GraphQLError('Access Denied')] } },
    ]);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Access Denied'));
  });
});

describe('payment trace helpers', () => {
  it('builds a bookmarkable, escaped trace path', () => {
    expect(paymentTracePath('pay_1')).toBe('/payment-trace?ref=pay_1');
    expect(paymentTracePath('DUN/2026 1')).toBe('/payment-trace?ref=DUN%2F2026%201');
  });

  it('links only whole Duncit and Razorpay ids found in log values', () => {
    for (const id of ['DPAY-1', 'pay_1', 'order_1', 'rfnd_1']) expect(isTraceableId(id)).toBe(true);
    for (const value of ['pay_', 'captured', '499', 'pay_1 extra', ' pay_1', 'PAY_1', 'payment_1']) expect(isTraceableId(value)).toBe(false);
  });
});
