import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { useFoodOrder } from '../useFoodOrder';
import { useFoodInvoice } from '../useFoodInvoice';
import { useFoodFeedback } from '../useFoodFeedback';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  client: { query: vi.fn() },
  download: vi.fn(),
  postToServer: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
  useMutation: h.useMutation,
  useApolloClient: () => h.client,
}));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), downloadBase64File: h.download }));
vi.mock('../../../utils/imagekit', () => ({ postToServer: h.postToServer }));

const wrap = (url: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;

const order = (over: object = {}) => ({ id: 'o1', order_no: 'FO-1', venue_id: 'v1', status: 'PLACED', payment_status: 'PAID', ...over });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useFoodOrder', () => {
  const query = (over: object = {}) => {
    const q = { data: undefined as unknown, loading: false, error: undefined as unknown, refetch: vi.fn(), startPolling: vi.fn(), stopPolling: vi.fn(), ...over };
    h.useQuery.mockReturnValue(q);
    return q;
  };

  it('asks for the order with the access key from the link, and keeps it on the device', () => {
    query({ data: { venueFoodOrder: order() } });
    const { result } = renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/venue/v1/food-order/o1?key=ACCESS') });
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ variables: { orderId: 'o1', accessKey: 'ACCESS' }, skip: false });
    expect(result.current.accessKey).toBe('ACCESS');
    expect(result.current.order?.order_no).toBe('FO-1');
    expect(result.current.loading).toBe(false);
    expect(result.current.clientKey).toBe('');
    expect(Object.values(localStorage).join('')).toContain('ACCESS');
  });

  it('falls back to the key and client key remembered on the device that placed the order', () => {
    localStorage.setItem(
      'mweb_food_orders',
      JSON.stringify([{ order_id: 'o1', venue_id: 'v1', order_no: 'FO-1', access_key: 'STORED', client_key: 'CK', saved_at: Date.now(), finished: false }])
    );
    query({ data: { venueFoodOrder: order() } });
    const { result } = renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    expect(result.current.accessKey).toBe('STORED');
    expect(result.current.clientKey).toBe('CK');
  });

  it('has no access key for a signed-in guest opening their own order', () => {
    query({ data: { venueFoodOrder: order() } });
    const { result } = renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    expect(result.current.accessKey).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('skips the read without an order id', () => {
    query();
    renderHook(() => useFoodOrder(''), { wrapper: wrap('/x') });
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true });
  });

  it('is loading only while nothing is on screen', () => {
    query({ loading: true });
    expect(renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') }).result.current.loading).toBe(true);
    query({ loading: true, data: { venueFoodOrder: order() } });
    expect(renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') }).result.current.loading).toBe(false);
  });

  it('polls fast while payment is pending, slowly while the kitchen works, and not once served; stopping on unmount', () => {
    const q = query({ data: { venueFoodOrder: order({ payment_status: 'PENDING' }) } });
    const first = renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    expect(q.startPolling).toHaveBeenCalledWith(8000);
    first.unmount();
    expect(q.stopPolling).toHaveBeenCalled();
    const slow = query({ data: { venueFoodOrder: order() } });
    renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    expect(slow.startPolling).toHaveBeenCalledWith(20_000);
    const done = query({ data: { venueFoodOrder: order({ status: 'SERVED' }) } });
    renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    expect(done.startPolling).not.toHaveBeenCalled();
  });

  it('keeps the last order on screen through a failed re-read and hides the error', () => {
    const q = query({ data: { venueFoodOrder: order() } });
    const { result, rerender } = renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    h.useQuery.mockReturnValue({ ...q, data: undefined, error: new Error('offline') });
    rerender();
    expect(result.current.order?.order_no).toBe('FO-1');
    expect(result.current.error).toBeUndefined();
    expect(result.current.errorCode).toBe('');
  });

  it('reports an error and its code when there is nothing to show', () => {
    const err = Object.assign(new Error('x'), { errors: [{ message: 'x', extensions: { code: 'NOT_FOUND' } }] });
    query({ error: err });
    const { result } = renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x') });
    expect(result.current.order).toBeNull();
    expect(result.current.error).toBe(err);
    expect(result.current.errorCode).toBe('NOT_FOUND');
  });

  it('marks the stored order finished once it is served', () => {
    query({ data: { venueFoodOrder: order({ status: 'SERVED' }) } });
    renderHook(() => useFoodOrder('o1'), { wrapper: wrap('/x?key=K') });
    expect(Object.values(localStorage).join('')).toContain('"finished":true');
  });
});

describe('useFoodInvoice', () => {
  const inv = () => renderHook(() => useFoodInvoice({ id: 'o1', order_no: 'FO-1' }, 'KEY'));

  it('downloads the invoice PDF under a name from the order number', async () => {
    h.client.query.mockResolvedValue({ data: { venueFoodOrderInvoicePdfBase64: 'JVBER' } });
    const { result } = inv();
    await act(async () => result.current.download());
    expect(h.client.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { orderId: 'o1', accessKey: 'KEY' }, fetchPolicy: 'no-cache' }));
    expect(h.download).toHaveBeenCalledWith('JVBER', 'invoice-FO-1.pdf', 'application/pdf');
    expect(result.current.failed).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it('is busy during the download', async () => {
    let finish: (v: unknown) => void = () => undefined;
    h.client.query.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = inv();
    act(() => {
      void result.current.download();
    });
    expect(result.current.busy).toBe(true);
    await act(async () => finish({ data: { venueFoodOrderInvoicePdfBase64: 'X' } }));
    expect(result.current.busy).toBe(false);
  });

  it('says it failed for an empty answer, or when the request fails, and clears the flag on the next try', async () => {
    h.client.query.mockResolvedValueOnce({ data: { venueFoodOrderInvoicePdfBase64: '' } });
    const { result } = inv();
    await act(async () => result.current.download());
    expect(result.current.failed).toBe(true);
    expect(h.download).not.toHaveBeenCalled();
    h.client.query.mockRejectedValueOnce(new Error('offline'));
    await act(async () => result.current.download());
    expect(result.current.failed).toBe(true);
    h.client.query.mockResolvedValueOnce({ data: undefined });
    await act(async () => result.current.download());
    expect(result.current.failed).toBe(true);
    h.client.query.mockResolvedValueOnce({ data: { venueFoodOrderInvoicePdfBase64: 'OK' } });
    await act(async () => result.current.download());
    expect(result.current.failed).toBe(false);
  });
});

describe('useFoodFeedback', () => {
  // The hook calls useMutation twice per render: pass, then submit.
  const stableMutations = (issue: ReturnType<typeof vi.fn>, send: ReturnType<typeof vi.fn>, loading = false) => {
    let call = 0;
    h.useMutation.mockImplementation(() => (call++ % 2 === 0 ? [issue] : [send, { loading }]));
  };

  afterEach(() => vi.restoreAllMocks());

  it('uploads a photo with its own single-use pass and returns the address', async () => {
    const issue = vi.fn().mockResolvedValue({ data: { venueFoodFeedbackUploadPass: { token: 'p' } } });
    stableMutations(issue, vi.fn());
    h.postToServer.mockResolvedValue('https://ik/p.jpg');
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY'));
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    let url: string | null = null;
    await act(async () => {
      url = await result.current.uploadPhoto(file);
    });
    expect(issue).toHaveBeenCalledWith({ variables: { orderId: 'o1', accessKey: 'KEY' } });
    expect(h.postToServer).toHaveBeenCalledWith(file, { token: 'p' });
    expect(url).toBe('https://ik/p.jpg');
    expect(result.current.error).toBeNull();
    expect(result.current.uploading).toBe(false);
  });

  it('says the upload failed when the pass is missing or the server returns no address', async () => {
    const issue = vi.fn().mockResolvedValueOnce({ data: undefined }).mockResolvedValue({ data: { venueFoodFeedbackUploadPass: { token: 'p' } } });
    stableMutations(issue, vi.fn());
    const { result } = renderHook(() => useFoodFeedback('o1', null));
    const file = new File(['x'], 'p.jpg');
    await act(async () => {
      expect(await result.current.uploadPhoto(file)).toBeNull();
    });
    expect(result.current.error).toBe(fallbackT('mweb.venueFood.feedback.uploadFailed'));
    h.postToServer.mockResolvedValue(null);
    await act(async () => {
      expect(await result.current.uploadPhoto(file)).toBeNull();
    });
    expect(result.current.error).toBe(fallbackT('mweb.venueFood.feedback.uploadFailed'));
  });

  it('logs and reports an upload that throws, and the error can be cleared', async () => {
    stableMutations(vi.fn().mockRejectedValue(new Error('pass denied')), vi.fn());
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY'));
    await act(async () => {
      expect(await result.current.uploadPhoto(new File(['x'], 'p.jpg'))).toBeNull();
    });
    expect(result.current.error).toBe(fallbackT('mweb.venueFood.feedback.uploadFailed'));
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('sends the rating with a null comment when blank, and reports it saved', async () => {
    const send = vi.fn().mockResolvedValue({});
    stableMutations(vi.fn(), send);
    const onRated = vi.fn();
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY', onRated));
    await act(async () => result.current.submit({ rating: 4, comment: '', images: ['a'] }));
    expect(send).toHaveBeenCalledWith({ variables: { input: { order_id: 'o1', access_key: 'KEY', rating: 4, comment: null, images: ['a'] } } });
    expect(onRated).toHaveBeenCalledTimes(1);
    await act(async () => result.current.submit({ rating: 5, comment: 'Great', images: [] }));
    expect(send.mock.calls[1][0].variables.input.comment).toBe('Great');
  });

  it('works without an onRated callback', async () => {
    stableMutations(vi.fn(), vi.fn().mockResolvedValue({}));
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY'));
    await act(async () => result.current.submit({ rating: 4, comment: '', images: [] }));
    expect(result.current.error).toBeNull();
  });

  it('says it could not be sent for a failure, without re-reading the order', async () => {
    stableMutations(vi.fn(), vi.fn().mockRejectedValue(new Error('offline')));
    const onRated = vi.fn();
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY', onRated));
    await act(async () => result.current.submit({ rating: 4, comment: '', images: [] }));
    expect(result.current.error).toBe(fallbackT('mweb.venueFood.feedback.submitFailed'));
    expect(onRated).not.toHaveBeenCalled();
  });

  it('says it was already rated for a conflict and re-reads the order so it shows what was said', async () => {
    const conflict = Object.assign(new Error('x'), { errors: [{ message: 'x', extensions: { code: 'CONFLICT' } }] });
    stableMutations(vi.fn(), vi.fn().mockRejectedValue(conflict));
    const onRated = vi.fn();
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY', onRated));
    await act(async () => result.current.submit({ rating: 4, comment: '', images: [] }));
    expect(result.current.error).toBe(fallbackT('mweb.venueFood.feedback.alreadyRated'));
    expect(onRated).toHaveBeenCalledTimes(1);
  });

  it('does not re-read on a conflict when nobody asked to', async () => {
    const conflict = Object.assign(new Error('x'), { errors: [{ message: 'x', extensions: { code: 'CONFLICT' } }] });
    stableMutations(vi.fn(), vi.fn().mockRejectedValue(conflict));
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY'));
    await act(async () => result.current.submit({ rating: 4, comment: '', images: [] }));
    expect(result.current.error).toBe(fallbackT('mweb.venueFood.feedback.alreadyRated'));
  });

  it('reports submitting while the rating is on its way', async () => {
    stableMutations(vi.fn(), vi.fn(), true);
    const { result } = renderHook(() => useFoodFeedback('o1', 'KEY'));
    await waitFor(() => expect(result.current.submitting).toBe(true));
  });
});
