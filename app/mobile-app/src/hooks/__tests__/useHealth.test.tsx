import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useAccountHealth, useVenueHealth } from '@/hooks/useHealth';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

let focusCallback: (() => void) | undefined;
const mockAddListener = jest.fn((_event: string, cb: () => void) => {
  focusCallback = cb;
  return jest.fn();
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ addListener: mockAddListener }),
}));

const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  focusCallback = undefined;
  mockRequest.mockReset();
});

const health = { base_score: 100, delta_sum: 0, total_score: 100, band: 'GREEN', adjustments: [] };

describe('useAccountHealth', () => {
  it('loads account health', async () => {
    mockRequest.mockResolvedValue({ myAccountHealth: health });
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health?.band).toBe('GREEN');
  });

  it('captures an error', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing account score to null', async () => {
    mockRequest.mockResolvedValue({ myAccountHealth: null });
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });

  it('refetches when the screen regains focus', async () => {
    mockRequest.mockResolvedValue({ myAccountHealth: health });
    const { result } = renderHook(() => useAccountHealth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
    const before = mockRequest.mock.calls.length;
    await act(async () => {
      focusCallback?.();
    });
    await waitFor(() => expect(mockRequest.mock.calls.length).toBeGreaterThan(before));
  });
});

describe('useVenueHealth', () => {
  it('loads venue health for a venue id', async () => {
    mockRequest.mockResolvedValue({ myVenueHealth: { ...health, subject_label: 'Cafe' } });
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
    mockRequest.mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useVenueHealth('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing venue score to null', async () => {
    mockRequest.mockResolvedValue({ myVenueHealth: null });
    const { result } = renderHook(() => useVenueHealth('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });

  it('refetches the venue score when the screen regains focus', async () => {
    mockRequest.mockResolvedValue({ myVenueHealth: health });
    const { result } = renderHook(() => useVenueHealth('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = mockRequest.mock.calls.length;
    await act(async () => {
      focusCallback?.();
    });
    await waitFor(() => expect(mockRequest.mock.calls.length).toBeGreaterThan(before));
  });
});
