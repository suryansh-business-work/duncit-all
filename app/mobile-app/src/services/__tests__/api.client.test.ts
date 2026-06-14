import { apiRequest } from '@/services/api.client';
import { ApiError } from '@/utils/errors';

describe('apiRequest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns parsed JSON on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ value: 42 }),
    } as Response);

    await expect(apiRequest<{ value: number }>('/ping')).resolves.toEqual({ value: 42 });
  });

  it('throws ApiError with status on non-2xx', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    await expect(apiRequest('/missing')).rejects.toMatchObject({ status: 404 });
  });

  it('maps an aborted request to a timeout ApiError', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(apiRequest('/slow')).rejects.toBeInstanceOf(ApiError);
  });

  it('maps an abort to a timeout without the DOMException global (Hermes/RN has none)', async () => {
    const original = (global as { DOMException?: unknown }).DOMException;
    delete (global as { DOMException?: unknown }).DOMException;
    try {
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      await expect(apiRequest('/slow')).rejects.toThrow(/timed out/i);
    } finally {
      (global as { DOMException?: unknown }).DOMException = original;
    }
  });

  it('serialises a JSON body and sends it with the request', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: 1 }),
    } as Response);

    await expect(apiRequest('/echo', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      ok: 1,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/echo'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ a: 1 }) }),
    );
  });

  it('wraps an unexpected failure as a network ApiError', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('socket hang up'));

    await expect(apiRequest('/x')).rejects.toThrow(/network error/i);
  });

  it('aborts the request once the timeout elapses', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'fetch').mockImplementation(
      ((_url: string, opts?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        })) as typeof fetch,
    );

    const promise = apiRequest('/slow');
    jest.runOnlyPendingTimers(); // fires the timeout → controller.abort()
    await expect(promise).rejects.toBeInstanceOf(ApiError);
  });
});
