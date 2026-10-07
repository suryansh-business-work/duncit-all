import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import { AccessibilityInfo } from 'react-native';

import { MyHostRequestLimitDocument, SetMyVenueRequestLimitDocument } from '@/graphql/pod-requests';
import { useHostRequestLimit } from '@/hooks/useHostRequestLimit';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

let mockLogError: jest.SpyInstance;

const host = { id: 'h1', max_venue_requests_per_month: 10, venue_requests_limit_override: null };

beforeEach(() => {
  mockRequest.mockReset();
  mockLogError = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
});

describe('useHostRequestLimit', () => {
  it("loads the host's cap and saves a new one, showing what the server kept", async () => {
    mockRequest.mockResolvedValueOnce({ myHost: host });
    const { result } = renderHook(() => useHostRequestLimit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest).toHaveBeenCalledWith(MyHostRequestLimitDocument, undefined, {
      auth: true,
    });
    expect(result.current.host).toEqual(host);
    expect(result.current.saved).toBe(false);

    const kept = { ...host, max_venue_requests_per_month: 25, venue_requests_limit_override: 5 };
    mockRequest.mockResolvedValueOnce({ setMyVenueRequestLimit: kept });
    await act(async () => {
      await result.current.save(25);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      SetMyVenueRequestLimitDocument,
      { limit: 25 },
      {
        auth: true,
      },
    );
    expect(result.current.host).toEqual(kept);
    expect(result.current.saved).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(result.current.saveError).toBeNull();
  });

  it('keeps the old cap and shows the refusal when a save fails', async () => {
    mockRequest.mockResolvedValueOnce({ myHost: host });
    const { result } = renderHook(() => useHostRequestLimit());
    await waitFor(() => expect(result.current.host).toEqual(host));

    mockRequest.mockRejectedValueOnce(new Error('Limit must be 0-100'));
    await act(async () => {
      await result.current.save(500);
    });
    expect(result.current.saveError).toBe('Limit must be 0-100');
    expect(result.current.saved).toBe(false);
    expect(result.current.host).toEqual(host);

    mockRequest.mockRejectedValueOnce(null);
    await act(async () => {
      await result.current.save(1);
    });
    expect(result.current.saveError).toMatch(/Something went wrong/);
  });

  it('reports no host profile, and a failed load', async () => {
    mockRequest.mockResolvedValueOnce({ myHost: null });
    const { result } = renderHook(() => useHostRequestLimit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.host).toBeNull();
    expect(result.current.loadError).toBeNull();

    mockRequest.mockRejectedValueOnce(new Error('Offline'));
    const { result: failed } = renderHook(() => useHostRequestLimit());
    await waitFor(() => expect(failed.current.loadError).toBe('Offline'));
    expect(failed.current.host).toBeNull();
  });
});

describe('useReduceMotion', () => {
  const remove = jest.fn();
  let listener: (enabled: boolean) => void = () => undefined;

  beforeEach(() => {
    remove.mockReset();
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
      _event: string,
      handler: (enabled: boolean) => void,
    ) => {
      listener = handler;
      return { remove };
    }) as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('reads the device setting, follows its changes and stops listening on unmount', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result, unmount } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));

    act(() => listener(false));
    expect(result.current).toBe(false);

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('ignores an answer that lands after unmount', async () => {
    let answer: (value: boolean) => void = () => undefined;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
      new Promise<boolean>((resolve) => {
        answer = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useReduceMotion());
    const before = result.current;
    unmount();
    await act(async () => {
      answer(true);
      await Promise.resolve();
    });
    expect(before).toBe(false);
    expect(result.current).toBe(false);
  });

  it('logs a failed read and keeps motion on', async () => {
    const error = new Error('unsupported');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(error);
    const { result } = renderHook(() => useReduceMotion());
    await waitFor(() =>
      expect(mockLogError).toHaveBeenCalledWith('useReduceMotion', 'isReduceMotionEnabled', {
        error,
      }),
    );
    expect(result.current).toBe(false);
  });
});
