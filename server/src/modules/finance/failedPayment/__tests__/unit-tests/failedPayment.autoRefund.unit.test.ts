/**
 * The automatic refund of a capture that bought nothing: who qualifies, that it
 * goes through the same at-most-once `claimAndSend` as Finance's button (as the
 * SYSTEM actor), that it never throws into the payment flow, and which cases the
 * reconciler's sweep picks up. The claim/send itself has its own suite.
 */
jest.mock('../../failedPaymentCase.model', () => ({
  FailedPaymentCaseModel: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { findById: jest.fn() } }));
jest.mock('../../failedPayment.refund', () => ({ claimAndSend: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { FailedPaymentCaseModel } from '../../failedPaymentCase.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { claimAndSend } from '../../failedPayment.refund';
import { logs } from '@observability/log';
import { SYSTEM_ACTOR } from '../../failedPayment.types';
import {
  AUTO_REFUND_MAX_ATTEMPTS,
  autoRefundCase,
  isAutoRefundable,
  sweepAutoRefunds,
} from '../../failedPayment.autoRefund';

const m = (fn: unknown) => fn as jest.Mock;
const CASE_ID = '65aa00000000000000000001';

const kase = (over: Record<string, unknown> = {}) =>
  ({
    _id: CASE_ID,
    payment_doc_id: '65aa00000000000000000002',
    sources: ['FINALIZE_FAILED'],
    resolution: { state: 'OPEN' },
    refund: { status: '', attempts: 0 },
    ...over,
  }) as never;

const payment = (over: Record<string, unknown> = {}) => ({
  gateway: 'RAZORPAY',
  finalize_state: 'FAILED',
  needs_refund: true,
  status: 'PENDING',
  ...over,
});

/** PaymentModel.findById(...).select(...).lean() */
const paymentQuery = (row: unknown) => ({ select: () => ({ lean: async () => row }) });

beforeEach(() => {
  jest.clearAllMocks();
  m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
  m(PaymentModel.findById).mockReturnValue(paymentQuery(payment()));
  m(claimAndSend).mockResolvedValue(kase({ refund: { status: 'PROCESSED', attempts: 1 } }));
});

describe('isAutoRefundable', () => {
  it('accepts an open, never-refunded case for a captured payment whose booking failed', () => {
    expect(isAutoRefundable(kase(), payment() as never)).toBe(true);
  });

  it('retries a FAILED refund while attempts remain, and stops at the budget', () => {
    expect(isAutoRefundable(kase({ refund: { status: 'FAILED', attempts: 2 } }), payment() as never)).toBe(true);
    expect(
      isAutoRefundable(kase({ refund: { status: 'FAILED', attempts: AUTO_REFUND_MAX_ATTEMPTS } }), payment() as never)
    ).toBe(false);
  });

  it.each([
    ['a refund already on its way', kase({ refund: { status: 'PENDING', attempts: 1 } })],
    ['a refund already processed', kase({ refund: { status: 'PROCESSED', attempts: 1 } })],
    ['a closed case', kase({ resolution: { state: 'BOOKED' } })],
    ['a case only the buyer reported (no proven capture)', kase({ sources: ['CLIENT_REPORT'] })],
  ])('refuses %s', (_label, theCase) => {
    expect(isAutoRefundable(theCase, payment() as never)).toBe(false);
  });

  it.each([
    ['no payment row', null],
    ['a booking that committed after all', payment({ finalize_state: 'CORE_DONE' })],
    ['a zero-charge settlement with nothing to give back', payment({ needs_refund: false })],
    ['money already refunded', payment({ status: 'REFUNDED' })],
    ['a non-Razorpay gateway', payment({ gateway: 'DUMMY' })],
  ])('refuses %s', (_label, row) => {
    expect(isAutoRefundable(kase(), row as never)).toBe(false);
  });
});

describe('autoRefundCase', () => {
  it('sends the refund through claimAndSend as SYSTEM, keyed to this attempt', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase({ refund: { status: 'FAILED', attempts: 1 } }));
    await autoRefundCase(CASE_ID);
    expect(claimAndSend).toHaveBeenCalledTimes(1);
    expect(claimAndSend).toHaveBeenCalledWith(expect.objectContaining({ _id: CASE_ID }), `auto_${CASE_ID}_2`, SYSTEM_ACTOR);
  });

  it('does nothing for a case that does not qualify', async () => {
    m(PaymentModel.findById).mockReturnValue(paymentQuery(payment({ finalize_state: 'COMPLETE' })));
    await autoRefundCase(CASE_ID);
    expect(claimAndSend).not.toHaveBeenCalled();
  });

  it('does nothing for a case that no longer exists', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(null);
    await autoRefundCase(CASE_ID);
    expect(PaymentModel.findById).not.toHaveBeenCalled();
    expect(claimAndSend).not.toHaveBeenCalled();
  });

  it('never throws: a refusal from the live check is logged and left for the next pass', async () => {
    m(claimAndSend).mockRejectedValue(new Error('Razorpay shows this payment as authorized; only captured money can be refunded.'));
    await expect(autoRefundCase(CASE_ID)).resolves.toBeUndefined();
    expect(logs.server.warn).toHaveBeenCalledWith('failedPayment', 'autoRefundCase', expect.objectContaining({ case_id: CASE_ID }));
  });
});

describe('sweepAutoRefunds', () => {
  const findChain = (rows: Array<{ _id: string }>) => {
    const chain = { select: jest.fn(), sort: jest.fn(), limit: jest.fn(), lean: jest.fn().mockResolvedValue(rows) };
    chain.select.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
  };

  it('picks never-tried cases and failed tries older than ten minutes, within the attempt budget', async () => {
    const now = Date.parse('2026-11-22T12:00:00.000Z');
    m(FailedPaymentCaseModel.find).mockReturnValue(findChain([]));
    await sweepAutoRefunds(now);
    expect(FailedPaymentCaseModel.find).toHaveBeenCalledWith({
      sources: 'FINALIZE_FAILED',
      'resolution.state': 'OPEN',
      'refund.attempts': { $lt: AUTO_REFUND_MAX_ATTEMPTS },
      $or: [
        { 'refund.status': '' },
        { 'refund.status': 'FAILED', updated_at: { $lt: new Date(now - 10 * 60_000) } },
      ],
    });
  });

  it('refunds each due case and answers how many it looked at', async () => {
    const second = '65aa00000000000000000003';
    m(FailedPaymentCaseModel.find).mockReturnValue(findChain([{ _id: CASE_ID }, { _id: second }]));
    m(FailedPaymentCaseModel.findById).mockImplementation(async (id: string) => kase({ _id: id }));

    await expect(sweepAutoRefunds()).resolves.toBe(2);
    expect(claimAndSend).toHaveBeenCalledTimes(2);
    expect(m(claimAndSend).mock.calls.map((call) => call[1])).toEqual([`auto_${CASE_ID}_1`, `auto_${second}_1`]);
  });
});
