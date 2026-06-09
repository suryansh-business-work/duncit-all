import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useAccountHealth, useVenueHealth } from '@/hooks/useHealth';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => mockRequest.mockReset());

const health = { base_score: 100, delta_sum: 0, total_score: 100, band: 'GREEN', adjustments: [] };

describe('useAccountHealth', () => {
  it('loads account health', async () => {
    mockRequest.mockResolvedValueOnce({ myAccountHealth: health });
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health?.band).toBe('GREEN');
  });

  it('captures an error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing account score to null', async () => {
    mockRequest.mockResolvedValueOnce({ myAccountHealth: null });
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });
});

describe('useVenueHealth', () => {
  it('loads venue health for a venue id', async () => {
    mockRequest.mockResolvedValueOnce({ myVenueHealth: { ...health, subject_label: 'Cafe' } });
    const { result } = renderHook(() => useVenueHealth('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health?.subject_label).toBe('Cafe');
    expect(mockRequest).toHaveBeenCalledWith(expect.anything(), { venue_id: 'v1' }, { auth: true });
  });

  it('skips fetching when no venue id is given', async () => {
    const { result } = renderHook(() => useVenueHealth(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.health).toBeNull();
  });

  it('captures an error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('bad'));
    const { result } = renderHook(() => useVenueHealth('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing venue score to null', async () => {
    mockRequest.mockResolvedValueOnce({ myVenueHealth: null });
    const { result } = renderHook(() => useVenueHealth('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });
});
