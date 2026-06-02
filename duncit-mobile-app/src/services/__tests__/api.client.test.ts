import { apiRequest } from '@/services/api.client';
import { ApiError } from '@/utils/errors';

describe('apiRequest', () => {
  afterEach(() => jest.restoreAllMocks());

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
});
