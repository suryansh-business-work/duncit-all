import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useMyMeeting } from '@/hooks/useMyMeeting';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const req = graphqlRequest as jest.Mock;

beforeEach(() => req.mockReset());

describe('useMyMeeting', () => {
  it('loads the meeting for a kind', async () => {
    req.mockResolvedValue({ myMeeting: { id: 'm', status: 'SCHEDULED' } });
    const { result } = renderHook(() => useMyMeeting('HOST'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.meeting?.id).toBe('m');
  });

  it('falls back to null on error', async () => {
    req.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useMyMeeting('VENUE'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.meeting).toBeNull();
  });

  it('ignores a resolve after unmount', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    req.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount, result } = renderHook(() => useMyMeeting('HOST'));
    unmount();
    await act(async () => {
      resolve({ myMeeting: { id: 'm' } });
    });
    expect(result.current.meeting).toBeNull();
  });

  it('ignores a reject after unmount', async () => {
    let reject: (err: unknown) => void = () => undefined;
    req.mockReturnValue(
      new Promise((_resolve, rj) => {
        reject = rj;
      }),
    );
    const { unmount, result } = renderHook(() => useMyMeeting('HOST'));
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
    expect(result.current.meeting).toBeNull();
  });
});
