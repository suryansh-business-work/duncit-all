/**
 * The buyer's two mutations: a payment is only ever theirs to report or claim
 * (anyone else gets NOT_FOUND), a report is counted once per request id, and a
 * claim opens ONE PAYMENT ticket per payment — reusing the case's ticket or the
 * buyer's open ticket already linked to the payment.
 */
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } } }));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { findOne: jest.fn() } }));
jest.mock('../../failedPaymentCase.model', () => ({ FailedPaymentCaseModel: { updateOne: jest.fn() } }));
jest.mock('../../failedPaymentCase.service', () => ({
  isCaseEligible: (p: { gateway: string; target_type: string }) => p.gateway === 'RAZORPAY' && p.target_type === 'POD',
  upsertCaseForPayment: jest.fn(),
  caseForPayment: jest.fn(),
}));
jest.mock('@modules/support/ticket/ticket.service', () => ({
  ticketService: { createTicket: jest.fn(), statusOf: jest.fn(), findOpenForPayment: jest.fn() },
}));
jest.mock('../../failedPayment.verify', () => ({ verifyInBackground: jest.fn() }));
jest.mock('@modules/platform/upload/privateMedia', () => ({ signedPrivateUrl: jest.fn() }));
jest.mock('../../paymentEvent.service', () => ({ recordPaymentEvent: jest.fn().mockResolvedValue(true) }));

import { SERVER_ENV } from '@observability/log';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { FailedPaymentCaseModel } from '../../failedPaymentCase.model';
import { caseForPayment, upsertCaseForPayment } from '../../failedPaymentCase.service';
import { ticketService } from '@modules/support/ticket/ticket.service';
import { verifyInBackground } from '../../failedPayment.verify';
import { recordPaymentEvent } from '../../paymentEvent.service';
import { reportPaymentFailure } from '../../failedPayment.report';
import { submitPaymentDeductionClaim } from '../../failedPayment.claim';

const m = (fn: unknown) => fn as jest.Mock;
const USER = '65aa00000000000000000001';
const PAYMENT_DOC = '65aa00000000000000000002';
const CASE_ID = '65aa00000000000000000003';
const TICKET_ID = '65aa00000000000000000004';

const payment = { _id: PAYMENT_DOC, payment_id: 'PAY-1', gateway: 'RAZORPAY', target_type: 'POD', pod_id: null, metadata: { razorpay_order_id: 'order_1' } };
const kase = (over: Record<string, unknown> = {}) => ({
  _id: CASE_ID,
  payment_id: 'PAY-1',
  amount: 499,
  currency_symbol: '₹',
  pod_title: 'Sunday Hike',
  razorpay_payment_id: 'pay_1',
  claims: [],
  ticket_id: null,
  ticket_no: '',
  attempts: 1,
  resolution: { state: 'OPEN' },
  ...over,
});

const claimInput = (over: Record<string, unknown> = {}) => ({
  payment_doc_id: PAYMENT_DOC,
  evidence_type: 'TRANSACTION_ID' as const,
  file_refs: [] as string[],
  transaction_id: 'pay_1',
  client_request_id: 'claim-req-1',
  ...over,
});

const reportInput = {
  payment_doc_id: PAYMENT_DOC,
  kind: 'FAILED' as const,
  razorpay_payment_id: 'pay_1',
  razorpay_order_id: 'order_1',
  error_code: 'BAD_REQUEST_ERROR',
  error_description: 'Declined',
  error_reason: '',
  error_source: '',
  error_step: '',
  retry_shown: true,
  attempt_number: 2,
  client_request_id: 'report-req-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  m(PaymentModel.findOne).mockResolvedValue(payment);
  m(upsertCaseForPayment).mockResolvedValue(kase());
  m(caseForPayment).mockResolvedValue(null);
  m(FailedPaymentCaseModel.updateOne).mockResolvedValue({ modifiedCount: 1 });
  m(ticketService.findOpenForPayment).mockResolvedValue(null);
  m(ticketService.statusOf).mockResolvedValue(null);
  m(ticketService.createTicket).mockResolvedValue({ id: TICKET_ID, ticket_no: 'ST-NEW001' });
  m(recordPaymentEvent).mockResolvedValue(true);
});

describe('ownership', () => {
  it('looks the payment up scoped to the caller and answers NOT_FOUND for anyone else', async () => {
    m(PaymentModel.findOne).mockResolvedValue(null);
    await expect(reportPaymentFailure(reportInput, USER)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(submitPaymentDeductionClaim(claimInput(), USER)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(m(PaymentModel.findOne).mock.calls[0][0]).toMatchObject({ _id: PAYMENT_DOC });
    expect(String(m(PaymentModel.findOne).mock.calls[0][0].user_id)).toBe(USER);
    expect(ticketService.createTicket).not.toHaveBeenCalled();
  });

  it('refuses a product or gift-card payment (they have their own refund flows)', async () => {
    m(PaymentModel.findOne).mockResolvedValue({ ...payment, target_type: 'PRODUCT' });
    await expect(submitPaymentDeductionClaim(claimInput(), USER)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses evidence another account uploaded', async () => {
    const foreign = `https://ik.imagekit.io/duncit/${SERVER_ENV}/payment_evidence/65aa00000000000000000999/evidence/a.png`;
    await expect(
      submitPaymentDeductionClaim(claimInput({ evidence_type: 'SCREENSHOT', file_refs: [foreign], transaction_id: '' }), USER)
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(upsertCaseForPayment).not.toHaveBeenCalled();
  });
});

describe('reportPaymentFailure', () => {
  it('opens the case with the Razorpay error and counts the attempt once', async () => {
    await expect(reportPaymentFailure(reportInput, USER)).resolves.toEqual({ case_id: CASE_ID, razorpay_payment_id: 'pay_1' });
    expect(upsertCaseForPayment).toHaveBeenCalledWith(
      payment,
      expect.objectContaining({ source: 'CLIENT_REPORT', countAttempt: true, retryShown: true, razorpayPaymentId: 'pay_1' })
    );
    expect(recordPaymentEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'RETRY_ATTEMPT' }));
  });

  it('answers a retried report with the same case and counts nothing', async () => {
    m(caseForPayment).mockResolvedValue(kase());
    m(recordPaymentEvent).mockResolvedValue(false);
    await expect(reportPaymentFailure(reportInput, USER)).resolves.toEqual({ case_id: CASE_ID, razorpay_payment_id: 'pay_1' });
    expect(upsertCaseForPayment).not.toHaveBeenCalled();
  });
});

describe('submitPaymentDeductionClaim', () => {
  it('opens one PAYMENT ticket linked to the payment and starts the check', async () => {
    await expect(submitPaymentDeductionClaim(claimInput(), USER)).resolves.toEqual({
      case_id: CASE_ID,
      ticket_no: 'ST-NEW001',
      already_open: false,
    });
    expect(ticketService.createTicket).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ category: 'PAYMENT', payment_id: PAYMENT_DOC, body_text: expect.stringContaining('Transaction ID given: pay_1') })
    );
    expect(verifyInBackground).toHaveBeenCalledWith(CASE_ID);
  });

  it('reuses the buyer’s open ticket already linked to the payment (the timeout ticket)', async () => {
    m(ticketService.findOpenForPayment).mockResolvedValue({ id: TICKET_ID, ticket_no: 'ST-OLD001', status: 'OPEN' });
    await expect(submitPaymentDeductionClaim(claimInput(), USER)).resolves.toEqual({
      case_id: CASE_ID,
      ticket_no: 'ST-OLD001',
      already_open: true,
    });
    expect(ticketService.findOpenForPayment).toHaveBeenCalledWith(USER, PAYMENT_DOC);
    expect(ticketService.createTicket).not.toHaveBeenCalled();
    expect(FailedPaymentCaseModel.updateOne).toHaveBeenCalledWith(
      { _id: CASE_ID },
      expect.objectContaining({ $set: expect.objectContaining({ ticket_no: 'ST-OLD001' }) })
    );
  });

  it('reuses the case’s own ticket while it is still open', async () => {
    m(upsertCaseForPayment).mockResolvedValue(kase({ ticket_id: TICKET_ID, ticket_no: 'ST-CASE01' }));
    m(ticketService.statusOf).mockResolvedValue({ id: TICKET_ID, ticket_no: 'ST-CASE01', status: 'PENDING' });
    const result = await submitPaymentDeductionClaim(claimInput(), USER);
    expect(result).toEqual({ case_id: CASE_ID, ticket_no: 'ST-CASE01', already_open: true });
    expect(ticketService.createTicket).not.toHaveBeenCalled();
  });

  it('answers a repeat of the same claim without opening anything', async () => {
    m(upsertCaseForPayment).mockResolvedValue(
      kase({ claims: [{ client_request_id: 'claim-req-1' }], ticket_id: TICKET_ID, ticket_no: 'ST-CASE01' })
    );
    m(ticketService.statusOf).mockResolvedValue({ id: TICKET_ID, ticket_no: 'ST-CASE01', status: 'OPEN' });
    await expect(submitPaymentDeductionClaim(claimInput(), USER)).resolves.toMatchObject({ already_open: true, ticket_no: 'ST-CASE01' });
    expect(ticketService.createTicket).not.toHaveBeenCalled();
    expect(verifyInBackground).not.toHaveBeenCalled();
  });

  it('tells a second, simultaneous claim to retry instead of opening a second ticket', async () => {
    m(FailedPaymentCaseModel.updateOne).mockImplementation(async (filter: Record<string, unknown>) =>
      '$or' in filter ? { modifiedCount: 0 } : { modifiedCount: 1 }
    );
    await expect(submitPaymentDeductionClaim(claimInput(), USER)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(ticketService.createTicket).not.toHaveBeenCalled();
  });

  it('does not reopen a case that was already refunded', async () => {
    m(upsertCaseForPayment).mockResolvedValue(kase({ resolution: { state: 'REFUNDED' }, ticket_no: 'ST-DONE01' }));
    await expect(submitPaymentDeductionClaim(claimInput({ client_request_id: 'claim-req-2' }), USER)).resolves.toMatchObject({
      ticket_no: 'ST-DONE01',
      already_open: true,
    });
    expect(ticketService.createTicket).not.toHaveBeenCalled();
  });
});
