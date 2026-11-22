import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import { CREATE_TICKET } from '../../../pages/support-tickets/queries';
import { REPORT_PAYMENT_FAILURE } from '../queries';
import { usePaymentFailure, type PaymentFailureContext } from '../usePaymentFailure';

const h = vi.hoisted(() => ({ createTicket: vi.fn(), recordFailure: vi.fn() }));
vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useMutation: (doc: unknown) => [doc === REPORT_PAYMENT_FAILURE ? h.recordFailure : h.createTicket, { loading: false }],
}));

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

let uuid = 0;
beforeEach(() => {
  uuid = 0;
  h.createTicket.mockReset().mockResolvedValue({ data: { createTicket: { ticket_no: 'ST-42' } } });
  h.recordFailure.mockReset().mockResolvedValue({ data: { reportPaymentFailure: { case_id: 'c1' } } });
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `req-${++uuid}` as `${string}-${string}-${string}-${string}-${string}`);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const sent = (call: number) => h.recordFailure.mock.calls[call][0].variables.input;

describe('usePaymentFailure — recording on the server', () => {
  it('records each failure against the payment, counting attempts with a fresh request id', async () => {
    const { result } = renderHook(() => usePaymentFailure(() => podContext, { reportToServer: true }));
    await act(() => result.current.report(decline));
    expect(result.current.failure?.kind).toBe('FAILED');
    expect(result.current.paymentDocId).toBe('doc9');
    expect(sent(0)).toEqual({
      payment_doc_id: 'doc9',
      kind: 'FAILED',
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_1',
      error_code: 'BAD_REQUEST_ERROR',
      error_description: 'Declined by the bank.',
      error_reason: 'payment_failed',
      error_source: 'bank',
      error_step: 'payment_authorization',
      retry_shown: true,
      attempt_number: 1,
      client_request_id: 'req-1',
    });
    await act(() => result.current.report(null));
    expect(sent(1)).toMatchObject({ kind: 'CANCELLED', razorpay_order_id: 'order_opened', attempt_number: 2, client_request_id: 'req-2' });
  });

  it('records nothing for screens that do not ask for it', async () => {
    const { result } = renderHook(() => usePaymentFailure(() => podContext));
    await act(() => result.current.report(decline));
    expect(h.recordFailure).not.toHaveBeenCalled();
    expect(result.current.failure?.kind).toBe('FAILED');
  });

  it('records nothing when no Duncit payment was created', async () => {
    const { result } = renderHook(() =>
      usePaymentFailure(() => ({ ...podContext, paymentDocId: null }), { reportToServer: true }),
    );
    await act(() => result.current.report(decline));
    expect(h.recordFailure).not.toHaveBeenCalled();
    expect(result.current.paymentDocId).toBeNull();
  });

  it('logs a report that did not land and still shows the dialog', async () => {
    const error = vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    h.recordFailure.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => usePaymentFailure(() => podContext, { reportToServer: true }));
    await act(() => result.current.report(decline));
    await waitFor(() => expect(error).toHaveBeenCalledWith('PaymentFailure', 'reportPaymentFailure', expect.any(Object)));
    expect(result.current.failure).not.toBeNull();
  });
});

describe('usePaymentFailure — the timeout ticket', () => {
  const timeout = { ...decline, reason: 'gateway_timeout' };

  it('opens a ticket for a timeout and quotes its number', async () => {
    const { result } = renderHook(() => usePaymentFailure(() => podContext, { reportToServer: true }));
    await act(() => result.current.report(timeout));
    expect(h.createTicket.mock.calls[0][0].variables.input.category).toBe('PAYMENT');
    expect(result.current).toMatchObject({ ticketNo: 'ST-42', ticketPending: false, ticketFailed: false });
    expect(sent(0).kind).toBe('TIMEOUT');
  });

  it('says the ticket failed when it could not be opened', async () => {
    h.createTicket.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => usePaymentFailure(() => podContext));
    await act(() => result.current.report(timeout));
    expect(result.current).toMatchObject({ ticketNo: null, ticketPending: false, ticketFailed: true });
  });

  it('clears everything on dismiss', async () => {
    const { result } = renderHook(() => usePaymentFailure(() => podContext));
    await act(() => result.current.report(decline));
    act(() => result.current.dismiss());
    expect(result.current).toMatchObject({ failure: null, paymentDocId: null, ticketNo: null });
  });
});
