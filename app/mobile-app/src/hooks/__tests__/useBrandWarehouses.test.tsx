import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useBrandWarehouses } from '@/hooks/useBrandWarehouses';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const BRANDS = [
  { id: 'b1', brand_name: 'Paws' },
  { id: 'b2', brand_name: 'Tails' },
];
const W1 = { id: 'w1', nickname: 'Main', shiprocket_registered: true, shiprocket_error: '' };
const W2 = { id: 'w2', nickname: 'Annex', shiprocket_registered: false, shiprocket_error: '' };

/** Answers by operation, from what each brand holds. */
function serve(byBrand: Record<string, unknown[]>, brands = BRANDS) {
  mockRequest.mockImplementation((doc: unknown, vars?: { brandId?: string }) => {
    if (!vars) return Promise.resolve({ myEcommBrands: brands });
    return Promise.resolve({ myBrandPickupLocations: byBrand[vars.brandId ?? ''] ?? [] });
  });
}

beforeEach(() => {
  mockRequest.mockReset();
});

describe('useBrandWarehouses', () => {
  it('opens on the first brand and its warehouses', async () => {
    serve({ b1: [W1], b2: [W2] });
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    expect(result.current).toMatchObject({ brandId: 'b1', isLoading: false, error: null });
  });

  it('switches to another brand', async () => {
    serve({ b1: [W1], b2: [W2] });
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    act(() => result.current.selectBrand('b2'));
    await waitFor(() => expect(result.current.warehouses).toEqual([W2]));
    expect(result.current.brandId).toBe('b2');
  });

  it('has nothing to load for a partner with no brand', async () => {
    serve({}, []);
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ brandId: '', warehouses: [] });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('replaces the list with what the sync found, and keeps its answer', async () => {
    serve({ b1: [W1] });
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    const synced = { warehouses: [W1, W2], shiprocket_error: '', adopted: 1, synced_at: 'now' };
    mockRequest.mockResolvedValueOnce({ syncMyBrandPickupLocations: synced });
    await act(async () => {
      await result.current.sync();
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { brandId: 'b1' },
      { auth: true },
    );
    expect(result.current).toMatchObject({ warehouses: [W1, W2], outcome: synced, syncing: false });

    // Another brand's page does not wear this brand's answer.
    act(() => result.current.selectBrand('b2'));
    expect(result.current.outcome).toBeNull();
  });

  it('says why a sync could not run', async () => {
    serve({ b1: [W1] });
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    mockRequest.mockRejectedValueOnce(new Error('Forbidden'));
    await act(async () => {
      await result.current.sync();
    });
    expect(result.current).toMatchObject({
      syncError: 'Forbidden',
      outcome: null,
      warehouses: [W1],
    });
    act(() => result.current.selectBrand('b2'));
    expect(result.current.syncError).toBeNull();
  });

  it('falls back to its own sentence when a sync fails without one', async () => {
    serve({ b1: [W1] });
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    mockRequest.mockRejectedValueOnce({});
    await act(async () => {
      await result.current.sync();
    });
    expect(result.current.syncError).toBe('That did not work. Try again.');
  });

  it('retries the brands when they did not load', async () => {
    mockRequest.mockRejectedValueOnce({});
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() =>
      expect(result.current.error).toBe('Could not load the warehouses. Try again.'),
    );
    serve({ b1: [W1] });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    expect(result.current.error).toBeNull();
  });

  it('retries the warehouses when only they did not load', async () => {
    mockRequest
      .mockResolvedValueOnce({ myEcommBrands: BRANDS })
      .mockRejectedValueOnce(new Error('Timeout'));
    const { result } = renderHook(() => useBrandWarehouses());
    await waitFor(() => expect(result.current.error).toBe('Timeout'));
    serve({ b1: [W1] });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.warehouses).toEqual([W1]));
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { brandId: 'b1' },
      { auth: true },
    );
  });
});
