/**
 * Finance › Failed Payments › one case: every section reads the case, private
 * evidence opens only through a fresh signed link, Re-verify and the decisions
 * repaint the page, and the timeline handles its own loading/empty/error.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { FailedPaymentDetailPage } from '../../src/pages/finance/failed-payments-page';
import { renderWithProviders } from '../testkit';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetUserContext, userContextControls } from './mocks/user-context';
import {
  evidenceLinkErrorMock,
  evidenceLinkMock,
  failedPaymentErrorMock,
  failedPaymentEventsErrorMock,
  failedPaymentEventsMock,
  failedPaymentMock,
  failedPaymentMutationMock,
  makeFailedPaymentDetail,
  makePaymentEvent,
} from '../mocks/failed-payments.mock';

const mount = (mocks: readonly MockedResponse[]) =>
  renderWithProviders(<FailedPaymentDetailPage />, {
    path: '/failed-payments/:id',
    entry: '/failed-payments/fp1',
    mocks,
    extra: <Route path="/failed-payments" element={<div data-testid="list-probe">list</div>} />,
  });

const waitForPage = () => screen.findByTestId('failed-payment-title');
const card = (testId: string) => within(screen.getByTestId(testId));

beforeEach(() => {
  resetUserContext();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('FailedPaymentDetailPage', () => {
  it('renders the payment, user, Razorpay error, retry info, verification, refund and ticket', async () => {
    userContextControls.user = { roles: ['FINANCE_USER'] };
    mount([failedPaymentMock(makeFailedPaymentDetail()), failedPaymentEventsMock([makePaymentEvent()])]);

    expect(await waitForPage()).toHaveTextContent('DUN-PAY-9001');
    expect(card('failed-payment-payment-card').getByText('order_RZP9')).toBeInTheDocument();
    expect(card('failed-payment-payment-card').getByRole('link', { name: 'DUN-PAY-9001' })).toHaveAttribute('href', '/payment-logs/pd1');
    expect(card('failed-payment-user-card').getByText('riya@duncit.com')).toBeInTheDocument();
    expect(card('failed-payment-error-card').getByText('payment_authorization')).toBeInTheDocument();
    expect(card('failed-payment-retry-card').getByText('CLIENT_REPORT, CLAIM')).toBeInTheDocument();
    expect(card('failed-payment-verification-card').getByText('92%')).toBeInTheDocument();
    expect(card('failed-payment-verification-card').getByText('Matched on the Razorpay payment id.')).toBeInTheDocument();
    expect(card('failed-payment-verification-card').getByText('412345678901')).toBeInTheDocument();
    expect(card('failed-payment-refund-card').getByText('₹499.00')).toBeInTheDocument();
    expect(card('failed-payment-ticket-card').getByText('ST-AB12CD')).toBeInTheDocument();
    expect(screen.getByText('Razorpay captured this payment, the amount matches and no booking used it. It can be refunded now.')).toBeInTheDocument();
    expect(await card('failed-payment-timeline-card').findByText('CLIENT_FAILURE_REPORTED')).toBeInTheDocument();
    expect(card('failed-payment-timeline-card').getByText('error_code: BAD_REQUEST_ERROR')).toBeInTheDocument();
    // A read-only seat gets no decisions.
    expect(screen.queryByTestId('failed-payment-reverify')).not.toBeInTheDocument();
    expect(screen.queryByTestId('failed-payment-action-refund')).not.toBeInTheDocument();
  });

  it('shows a refunded, reviewed case with no ticket and an empty sparse verification', async () => {
    const detail = makeFailedPaymentDetail({
      highlight: 'NONE',
      can_refund: false,
      latest_error: null,
      claims: [],
      ticket: null,
      review: { __typename: 'FailedPaymentReview', decision: 'APPROVED', note: 'Bank statement checks out', by_name: 'Asha', at: '2026-11-20T11:00:00.000Z' },
      refund: {
        __typename: 'FailedPaymentRefund',
        status: 'PROCESSED',
        razorpay_refund_id: 'rfnd_77',
        razorpay_payment_id: 'pay_RZP123',
        amount: 499,
        attempted_at: '2026-11-20T11:01:00.000Z',
        refunded_at: '2026-11-20T11:02:00.000Z',
        error: null,
        initiated_by_name: 'Asha',
      },
      resolution: { __typename: 'FailedPaymentResolution', state: 'REFUNDED', at: '2026-11-20T11:02:00.000Z', by_name: 'Asha', note: 'Refunded' },
      verification: {
        __typename: 'FailedPaymentVerification',
        status: 'UNMATCHED',
        confidence: null,
        extracted: null,
        matched_fields: [],
        matched_payment_id: null,
        razorpay_status: null,
        razorpay_amount_paise: null,
        checked_at: null,
        notes: null,
      },
      refundable_amount: null,
    });
    mount([failedPaymentMock(detail), failedPaymentEventsMock([])]);

    await waitForPage();
    expect(card('failed-payment-refund-card').getByText('rfnd_77')).toBeInTheDocument();
    expect(card('failed-payment-review-card').getByText('Bank statement checks out')).toBeInTheDocument();
    expect(card('failed-payment-ticket-card').getByText('No ticket yet')).toBeInTheDocument();
    expect(card('failed-payment-evidence-card').getByText('The buyer has not sent any evidence.')).toBeInTheDocument();
    expect(await card('failed-payment-timeline-card').findByText('No events recorded yet.')).toBeInTheDocument();
  });

  it('previews an image through a signed link, offers a PDF in a new tab, and shows a refused link', async () => {
    mount([
      failedPaymentMock(makeFailedPaymentDetail()),
      failedPaymentEventsMock([]),
      evidenceLinkMock('ref-img-1', 'IMAGE', 'https://ik.example/img.png?ik-s=sig'),
      evidenceLinkMock('ref-pdf-1', 'PDF', 'https://ik.example/stmt.pdf?ik-s=sig'),
      evidenceLinkErrorMock('ref-doc-1', 'Access Denied'),
    ]);
    await waitForPage();
    const files = screen.getAllByTestId('failed-payment-evidence-open');
    expect(card('failed-payment-evidence-card').getByText('Transaction ID: pay_RZP123')).toBeInTheDocument();

    fireEvent.click(files[0]);
    const image = await screen.findByRole('img', { name: 'Payment evidence sent by the buyer' });
    expect(image).toHaveAttribute('src', 'https://ik.example/img.png?ik-s=sig');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Payment evidence sent by the buyer' })).not.toBeInTheDocument());

    fireEvent.click(files[1]);
    const open = await screen.findByRole('link', { name: 'Open file' });
    expect(open).toHaveAttribute('href', 'https://ik.example/stmt.pdf?ik-s=sig');
    expect(open).toHaveAttribute('target', '_blank');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(files[2]);
    expect(await card('failed-payment-evidence-card').findByText('Access Denied')).toBeInTheDocument();
  });

  it('re-verifies for a manager and reports a refused re-run', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    mount([
      failedPaymentMock(makeFailedPaymentDetail()),
      failedPaymentEventsMock([]),
      failedPaymentMutationMock('reverifyFailedPayment', makeFailedPaymentDetail({ revision: 4, verification: { ...makeFailedPaymentDetail().verification, notes: 'Re-checked' } })),
      failedPaymentMutationMock('reverifyFailedPayment', 'Razorpay is unreachable'),
    ]);
    await waitForPage();
    fireEvent.click(screen.getByTestId('failed-payment-reverify'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Verification re-run. This page shows the fresh result.'));
    expect(await screen.findByText('Re-checked')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('failed-payment-reverify'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Razorpay is unreachable'));
  });

  it('refunds from the detail page with the exact refundable amount', async () => {
    userContextControls.user = { roles: ['FINANCE_MANAGER'] };
    const calls: Record<string, unknown>[] = [];
    mount([
      failedPaymentMock(makeFailedPaymentDetail({ refundable_amount: 450 })),
      failedPaymentEventsMock([]),
      failedPaymentMutationMock('initiateFailedPaymentRefund', makeFailedPaymentDetail({ can_refund: false, highlight: 'NONE', revision: 5 }), (v) => calls.push(v)),
    ]);
    await waitForPage();
    fireEvent.click(screen.getByTestId('failed-payment-action-refund'));
    expect(screen.getByText('Refund ₹450.00 to Riya Sharma through Razorpay?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('failed-payment-refund-confirm'));
    await waitFor(() => expect(calls).toHaveLength(1));
    await waitFor(() => expect(screen.queryByTestId('failed-payment-action-refund')).not.toBeInTheDocument());
  });

  it('explains yellow and never-captured cases', async () => {
    const yellow = mount([
      failedPaymentMock(makeFailedPaymentDetail({ highlight: 'YELLOW', can_refund: false, needs_review: true })),
      failedPaymentEventsMock([]),
    ]);
    await waitForPage();
    expect(screen.getByText('The evidence could not be matched automatically. Review it before a refund.')).toBeInTheDocument();
    yellow.unmount();

    mount([
      failedPaymentMock(makeFailedPaymentDetail({ highlight: 'NONE', can_refund: false, can_mark_not_refundable: true })),
      failedPaymentEventsMock([]),
    ]);
    await waitForPage();
    expect(screen.getByText(/Razorpay never captured this payment/)).toBeInTheDocument();
  });

  it('shows the timeline refusal and goes back to the list', async () => {
    mount([failedPaymentMock(makeFailedPaymentDetail()), failedPaymentEventsErrorMock('Timeline unavailable')]);
    await waitForPage();
    expect(await card('failed-payment-timeline-card').findByText('Timeline unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Failed Payments' }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
  });

  it('shows the page error when the case cannot load', async () => {
    mount([failedPaymentErrorMock('Access Denied')]);
    expect(await screen.findByTestId('qg-error')).toBeInTheDocument();
  });
});
