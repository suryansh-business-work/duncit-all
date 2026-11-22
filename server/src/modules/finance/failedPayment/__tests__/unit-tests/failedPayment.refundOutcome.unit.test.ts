/**
 * How a refund ends: whichever of Razorpay's answer, its webhook or the poller
 * reports it first does the ledger stamp, resolves the buyer's ticket and tells
 * them — exactly once. A refused refund is flagged FAILED and Finance is told.
 */
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } } }));
jest.mock('../../failedPaymentCase.model', () => ({
  FailedPaymentCaseModel: { findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { findById: jest.fn() } }));
jest.mock('@modules/finance/payment/payment.refundRecord', () => ({ recordPaymentRefund: jest.fn() }));
jest.mock('@modules/finance/payment/payment.service', () => ({ mailRefund: jest.fn() }));
jest.mock('@modules/finance/finance/finance.model', () => ({
  getFinanceSettings: jest.fn().mockResolvedValue({ refund_processing_days: 7 }),
}));
jest.mock('@services/notify/staffAlert', () => ({ alertStaff: jest.fn() }));
jest.mock('../../paymentEvent.service', () => ({ recordPaymentEvent: jest.fn().mockResolvedValue(true) }));
jest.mock('@modules/support/ticket/ticket.service', () => ({ ticketService: { systemResolve: jest.fn() } }));

import { FailedPaymentCaseModel } from '../../failedPaymentCase.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { recordPaymentRefund } from '@modules/finance/payment/payment.refundRecord';
import { mailRefund } from '@modules/finance/payment/payment.service';
import { alertStaff } from '@services/notify/staffAlert';
import { ticketService } from '@modules/support/ticket/ticket.service';
import { completeRefund, failRefund } from '../../failedPayment.refundOutcome';

const m = (fn: unknown) => fn as jest.Mock;
const CASE_ID = '65aa00000000000000000001';
const FINANCE_USER_ID = '65aa00000000000000000099';
const TICKET_ID = '65aa00000000000000000077';

const processedCase = () =>
  ({
    _id: CASE_ID,
    payment_doc_id: 'pdoc',
    payment_id: 'PAY-1',
    currency_symbol: '₹',
    pod_title: 'Sunday Hike',
    ticket_id: TICKET_ID,
    ticket_no: 'ST-ABC123',
    resolution: { state: 'REFUNDED' },
    refund: {
      status: 'PROCESSED',
      razorpay_refund_id: 'rfnd_1',
      razorpay_payment_id: 'pay_1',
      amount_paise: 49900,
      initiated_by: FINANCE_USER_ID,
      initiated_by_name: 'Fin Manager',
    },
  }) as never;

const payment = { _id: 'pdoc', total: 499, payment_id: 'PAY-1' };

beforeEach(() => {
  jest.clearAllMocks();
  m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(processedCase());
  m(FailedPaymentCaseModel.updateOne).mockResolvedValue({ modifiedCount: 1 });
  m(FailedPaymentCaseModel.findById).mockResolvedValue(processedCase());
  m(PaymentModel.findById).mockResolvedValue(payment);
});

describe('completeRefund', () => {
  it('records the ledger, resolves the ticket with the refund id and tells the buyer', async () => {
    await completeRefund(CASE_ID, 'rfnd_1', 'WEBHOOK');

    expect(recordPaymentRefund).toHaveBeenCalledWith(payment, 499, expect.any(String), FINANCE_USER_ID, 'rfnd_1');
    expect(ticketService.systemResolve).toHaveBeenCalledWith(
      TICKET_ID,
      FINANCE_USER_ID,
      expect.stringContaining('Razorpay refund rfnd_1')
    );
    expect(m(ticketService.systemResolve).mock.calls[0][2]).toContain('₹499.00');
    expect(m(ticketService.systemResolve).mock.calls[0][2]).toContain('7 business days');
    expect(mailRefund).toHaveBeenCalledWith(payment, expect.any(String));
  });

  it('files an automatic refund\'s ticket under the buyer and its ledger stamp under SYSTEM', async () => {
    const BUYER_ID = '65aa00000000000000000055';
    const automatic = () =>
      ({
        ...(processedCase() as object),
        user_id: BUYER_ID,
        refund: { ...(processedCase() as { refund: object }).refund, initiated_by: 'SYSTEM', initiated_by_name: 'SYSTEM' },
      }) as never;
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(automatic());

    await completeRefund(CASE_ID, 'rfnd_1', 'SERVER');

    expect(recordPaymentRefund).toHaveBeenCalledWith(payment, 499, expect.any(String), 'SYSTEM', 'rfnd_1');
    expect(ticketService.systemResolve).toHaveBeenCalledWith(TICKET_ID, BUYER_ID, expect.stringContaining('rfnd_1'));
    expect(mailRefund).toHaveBeenCalledWith(payment, expect.any(String));
  });

  it('flips state with a write that cannot match an already-processed refund', async () => {
    await completeRefund(CASE_ID, 'rfnd_1', 'SERVER');
    const [filter, update] = m(FailedPaymentCaseModel.findOneAndUpdate).mock.calls[0];
    expect(filter).toEqual({ _id: CASE_ID, 'refund.status': { $ne: 'PROCESSED' } });
    expect(update.$set).toMatchObject({ 'refund.status': 'PROCESSED', 'resolution.state': 'REFUNDED', 'refund.razorpay_refund_id': 'rfnd_1' });
  });

  it('does nothing a second time when the refund was already completed', async () => {
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(null);
    await completeRefund(CASE_ID, 'rfnd_1', 'SYSTEM');
    expect(recordPaymentRefund).not.toHaveBeenCalled();
    expect(ticketService.systemResolve).not.toHaveBeenCalled();
    expect(mailRefund).not.toHaveBeenCalled();
  });

  it('stamps the ledger only when it wins the finance_recorded flag', async () => {
    m(FailedPaymentCaseModel.updateOne).mockImplementation(async (filter: Record<string, unknown>) =>
      'refund.finance_recorded' in filter ? { modifiedCount: 0 } : { modifiedCount: 1 }
    );
    await completeRefund(CASE_ID, 'rfnd_1', 'SYSTEM');
    expect(recordPaymentRefund).not.toHaveBeenCalled();
    // The rest of the completion still happens.
    expect(ticketService.systemResolve).toHaveBeenCalledTimes(1);
  });

  it('releases the ledger flag when the stamp fails, so a later pass retries it', async () => {
    m(recordPaymentRefund).mockRejectedValueOnce(new Error('db down'));
    await completeRefund(CASE_ID, 'rfnd_1', 'SYSTEM');
    expect(FailedPaymentCaseModel.updateOne).toHaveBeenCalledWith(
      { _id: CASE_ID },
      { $set: { 'refund.finance_recorded': false } }
    );
  });

  it('still completes when the ticket cannot be updated', async () => {
    m(ticketService.systemResolve).mockRejectedValueOnce(new Error('Ticket not found'));
    await expect(completeRefund(CASE_ID, 'rfnd_1', 'SYSTEM')).resolves.toBeTruthy();
    expect(mailRefund).toHaveBeenCalled();
  });
});

describe('failRefund', () => {
  it('flags a pending refund FAILED and alerts the Finance desk', async () => {
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(processedCase());
    await failRefund(CASE_ID, 'Razorpay refund failed: balance', 'SERVER');
    const [filter, update] = m(FailedPaymentCaseModel.findOneAndUpdate).mock.calls[0];
    expect(filter).toEqual({ _id: CASE_ID, 'refund.status': 'PENDING' });
    expect(update.$set).toEqual({ 'refund.status': 'FAILED', 'refund.error': 'Razorpay refund failed: balance' });
    expect(alertStaff).toHaveBeenCalledWith(expect.objectContaining({ desk: 'FINANCE' }));
  });

  it('does not alert again for a refund that is no longer pending', async () => {
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(null);
    await failRefund(CASE_ID, 'late webhook', 'WEBHOOK');
    expect(alertStaff).not.toHaveBeenCalled();
  });
});
