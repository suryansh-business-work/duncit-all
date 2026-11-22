import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { usePaymentFailure, type PaymentFailureContext } from '@/components/payment-failure';
import { recordPaymentFailure } from '@/components/payment-failure/paymentFailureApi';
import { createTicket } from '@/hooks/useSupport';

jest.mock('@/components/payment-failure/paymentFailureApi', () => ({
  recordPaymentFailure: jest.fn(),
  submitPaymentClaim: jest.fn(),
}));
jest.mock('@/hooks/useSupport', () => ({ createTicket: jest.fn() }));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `req-${++mockUuid}` }));

const mockedRecord = recordPaymentFailure as jest.Mock;
const mockedTicket = createTicket as jest.Mock;

const decline = {
  code: 'BAD_REQUEST_ERROR',
  description: 'Declined by the bank.',
  reason: 'payment_failed',
  source: 'bank',
  step: 'payment_authorization',
  metadata: { payment_id: 'pay_1', order_id: 'order_1' },
};
const podContext: PaymentFailureContext = {
  description: 'Pod: Sunset Jam',
  amount: 1180,
  paymentDocId: 'doc9',
  razorpayOrderId: 'order_opened',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUuid = 0;
  mockedRecord.mockResolvedValue(undefined);
  mockedTicket.mockResolvedValue({ id: 't1', ticketNo: 'ST-42' });
});

describe('usePaymentFailure (native) — recording on the server', () => {
  it('records each failure against the payment with the attempt count and a fresh request id', async () => {
    const { result } = renderHook(() =>
      usePaymentFailure(() => podContext, { reportToServer: true }),
    );
    await act(() => result.current.report(decline));
    expect(result.current.paymentDocId).toBe('doc9');
    expect(mockedRecord).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payment_doc_id: 'doc9',
        kind: 'FAILED',
        razorpay_order_id: 'order_1',
        error_reason: 'payment_failed',
        error_source: 'bank',
        error_step: 'payment_authorization',
        attempt_number: 1,
        client_request_id: 'req-1',
      }),
    );
    await act(() => result.current.report(null));
    expect(mockedRecord).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'CANCELLED',
        razorpay_order_id: 'order_opened',
        attempt_number: 2,
        client_request_id: 'req-2',
      }),
    );
  });

  it('records nothing for screens that do not ask, or without a Duncit payment', async () => {
    const quiet = renderHook(() => usePaymentFailure(() => podContext));
    await act(() => quiet.result.current.report(decline));
    const noPayment = renderHook(() =>
      usePaymentFailure(() => ({ ...podContext, paymentDocId: null }), { reportToServer: true }),
    );
    await act(() => noPayment.result.current.report(decline));
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('logs a report that did not land and still shows the dialog', async () => {
    const error = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
    mockedRecord.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() =>
      usePaymentFailure(() => podContext, { reportToServer: true }),
    );
    await act(() => result.current.report(decline));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'PaymentFailure',
        'reportPaymentFailure',
        expect.any(Object),
      ),
    );
    expect(result.current.failure?.kind).toBe('FAILED');
    error.mockRestore();
  });

  it('still opens the timeout ticket alongside the report', async () => {
    const { result } = renderHook(() =>
      usePaymentFailure(() => podContext, { reportToServer: true }),
    );
    await act(() => result.current.report({ ...decline, reason: 'gateway_timeout' }));
    expect(mockedTicket).toHaveBeenCalledTimes(1);
    expect(result.current.ticketNo).toBe('ST-42');
    expect(mockedRecord).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'TIMEOUT' }));
  });
});
