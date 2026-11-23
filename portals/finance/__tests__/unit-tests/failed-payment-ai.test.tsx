/**
 * The case page's AI refund note and relevant links, the live-checked refund of
 * a case with no evidence, and ids in the timeline that open Payment Trace.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { FailedPaymentAiSummary } from '@duncit/gql-types';
import { FailedPaymentDetailPage } from '../../src/pages/finance/failed-payments-page';
import { relevantLinks } from '../../src/pages/finance/failed-payments-page/detail/RelevantLinks';
import { renderWithProviders } from '../testkit';
import { notifyError } from './mocks/dialogs';
import { resetUserContext, userContextControls } from './mocks/user-context';
import {
  failedPaymentEventsMock,
  failedPaymentMock,
  makeFailedPaymentDetail,
  makePaymentEvent,
  refundPreviewMock,
  summarizeMock,
} from '../mocks/failed-payments.mock';

const mount = (mocks: readonly MockedResponse[]) =>
  renderWithProviders(<FailedPaymentDetailPage />, { path: '/failed-payments/:id', entry: '/failed-payments/fp1', mocks });

const aiCard = () => within(screen.getByTestId('failed-payment-ai-card'));

const note = (over: Partial<FailedPaymentAiSummary> = {}): FailedPaymentAiSummary => ({
  __typename: 'FailedPaymentAiSummary',
  recommendation: 'REFUND',
  summary: 'Razorpay captured ₹499 and no booking used it.',
  reasons: ['The pod was full when the booking was written.', 'Razorpay can refund ₹499 now.'],
  generated_at: '2026-11-23T09:00:00.000Z',
  generated_by_name: 'Fin Manager',
  error: null,
  stale: false,
  ...over,
});

beforeEach(() => {
  resetUserContext();
  notifyError.mockClear();
});

describe('AI refund note', () => {
  it('asks for a note and shows the verdict, summary and reasons', async () => {
    userContextControls.user = { roles: ['FINANCE_USER'] };
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentMock(makeFailedPaymentDetail()),
      failedPaymentEventsMock([]),
      summarizeMock(makeFailedPaymentDetail({ ai_summary: note() }), (v) => calls.push(v)),
    ]);

    expect(await screen.findByText('No recommendation yet.')).toBeInTheDocument();
    fireEvent.click(aiCard().getByTestId('failed-payment-ai-ask'));

    const shown = await screen.findByTestId('failed-payment-ai-note');
    expect(calls).toEqual([{ caseId: 'fp1', force: false }]);
    expect(within(shown).getByText('Refund')).toBeInTheDocument();
    expect(within(shown).getByText('Razorpay captured ₹499 and no booking used it.')).toBeInTheDocument();
    expect(within(shown).getByText('The pod was full when the booking was written.')).toBeInTheDocument();
    expect(within(shown).getByText(/Asked by Fin Manager/)).toBeInTheDocument();
  });

  it('marks a note written before the case changed, and Refresh forces a new one', async () => {
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentMock(makeFailedPaymentDetail({ ai_summary: note({ stale: true, recommendation: 'NEEDS_REVIEW' }) })),
      failedPaymentEventsMock([]),
      summarizeMock(makeFailedPaymentDetail({ ai_summary: note() }), (v) => calls.push(v)),
    ]);

    expect(await screen.findByText('Needs review')).toBeInTheDocument();
    expect(aiCard().getByText('The case changed after this note was written. Refresh it for an up-to-date one.')).toBeInTheDocument();
    fireEvent.click(aiCard().getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(calls).toEqual([{ caseId: 'fp1', force: true }]));
  });

  it('shows why the AI wrote no note, and a refused request as a toast', async () => {
    mount([
      failedPaymentMock(makeFailedPaymentDetail({ ai_summary: note({ recommendation: null, summary: '', reasons: [], error: 'The AI feature is switched off.' }) })),
      failedPaymentEventsMock([]),
      summarizeMock('Access denied'),
    ]);

    expect(await screen.findByTestId('failed-payment-ai-error')).toHaveTextContent('The AI feature is switched off.');
    fireEvent.click(aiCard().getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Access denied'));
  });

  it('lists the relevant pages: trace, payment log, pod finance, Razorpay and the member', async () => {
    mount([
      failedPaymentMock(makeFailedPaymentDetail({ refund: { ...makeFailedPaymentDetail().refund, razorpay_refund_id: 'rfnd_77' } })),
      failedPaymentEventsMock([]),
    ]);

    const links = within(await screen.findByTestId('failed-payment-links'));
    expect(links.getByRole('link', { name: 'Payment trace (every log)' })).toHaveAttribute('href', '/payment-trace?ref=DUN-PAY-9001');
    expect(links.getByRole('link', { name: 'Payment log' })).toHaveAttribute('href', '/payment-logs/pd1');
    expect(links.getByRole('link', { name: 'Pod finance' })).toHaveAttribute('href', '/pod-finance/pod1');
    const razorpay = links.getByRole('link', { name: 'Razorpay payment (opens in a new tab)' });
    expect(razorpay).toHaveAttribute('href', 'https://dashboard.razorpay.com/app/payments/pay_RZP123');
    expect(razorpay).toHaveAttribute('target', '_blank');
    expect(razorpay).toHaveAttribute('rel', 'noopener noreferrer');
    expect(links.getByRole('link', { name: 'Razorpay refund (opens in a new tab)' })).toHaveAttribute('href', 'https://dashboard.razorpay.com/app/refunds/rfnd_77');
    expect(links.getByRole('link', { name: 'Member in Admin (opens in a new tab)' }).getAttribute('href')).toMatch(/\/users\/u1$/);
  });
});

describe('relevantLinks', () => {
  const t = (key: string) => key;
  const facts = makeFailedPaymentDetail();

  it('leaves out every link whose id the case lacks', () => {
    const keys = relevantLinks(t, {
      ...facts,
      pod_id: null,
      razorpay_payment_id: null,
      razorpay_order_id: null,
      user: { ...facts.user, id: null },
    }).map((l) => l.key);
    expect(keys).toEqual(['trace', 'payment']);
  });

  it('escapes ids into the paths', () => {
    const links = relevantLinks(t, { ...facts, payment_id: 'a b/c', razorpay_order_id: 'order_?x' });
    expect(links.find((l) => l.key === 'trace')?.href).toBe('/payment-trace?ref=a%20b%2Fc');
    expect(links.find((l) => l.key === 'rzp-order')?.href).toBe('https://dashboard.razorpay.com/app/orders/order_%3Fx');
  });
});

describe('refund of a case with no evidence', () => {
  const noEvidence = makeFailedPaymentDetail({ claims: [], highlight: 'NONE', can_refund: true, verification: { ...makeFailedPaymentDetail().verification, status: 'PENDING' } });

  it('says Razorpay is checked live, and keeps Confirm off when Razorpay has nothing to refund', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    mount([
      failedPaymentMock(noEvidence),
      failedPaymentEventsMock([]),
      refundPreviewMock({ refundable: false, amount: null, razorpay_payment_id: null, reason: 'Razorpay shows no captured payment on this order.' }),
    ]);

    expect(await screen.findByTestId('failed-payment-live-check-hint')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('failed-payment-action-refund'));
    expect(await screen.findByTestId('failed-payment-refund-blocked')).toHaveTextContent('Razorpay shows no captured payment on this order.');
    expect(screen.getByTestId('failed-payment-refund-confirm')).toBeDisabled();
    expect(screen.queryByText(/through Razorpay\?/)).not.toBeInTheDocument();
  });

  it('falls back to a plain sentence when Razorpay gives no reason', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    mount([failedPaymentMock(noEvidence), failedPaymentEventsMock([]), refundPreviewMock({ refundable: false, reason: null })]);
    fireEvent.click(await screen.findByTestId('failed-payment-action-refund'));
    expect(await screen.findByTestId('failed-payment-refund-blocked')).toHaveTextContent('Razorpay shows nothing to refund for this payment.');
  });
});

describe('timeline ids', () => {
  it('links ids to Payment Trace and leaves other values as text', async () => {
    mount([
      failedPaymentMock(makeFailedPaymentDetail()),
      failedPaymentEventsMock([
        makePaymentEvent({
          details: [
            { __typename: 'PaymentEventDetail', key: 'razorpay_payment_id', value: 'pay_EV1' },
            { __typename: 'PaymentEventDetail', key: 'status', value: 'captured' },
            { __typename: 'PaymentEventDetail', key: 'note', value: 'pay_ later please' },
          ],
        }),
      ]),
    ]);

    const timeline = within(await screen.findByTestId('failed-payment-timeline-card'));
    expect(await timeline.findByRole('link', { name: 'Trace pay_EV1' })).toHaveAttribute('href', '/payment-trace?ref=pay_EV1');
    expect(timeline.getByText(/status: captured/)).toBeInTheDocument();
    expect(timeline.queryByRole('link', { name: /pay_ later/ })).not.toBeInTheDocument();
  });
});
