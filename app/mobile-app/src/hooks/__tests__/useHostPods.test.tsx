import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useHostPods } from '@/hooks/useHostPods';
import { useMe } from '@/hooks/useMe';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockUseMe = useMe as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  mockUseMe.mockReset();
});

describe('useHostPods', () => {
  it('waits for the signed-in user before fetching', () => {
    mockUseMe.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useHostPods());
    expect(result.current.isLoading).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('refetch is a no-op without a user id', async () => {
    mockUseMe.mockReturnValue({ data: { me: null } });
    const { result } = renderHook(() => useHostPods());
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('loads the host pods once the user id arrives', async () => {
    mockUseMe.mockReturnValue({ data: { me: { user_id: 'u1' } } });
    mockRequest.mockResolvedValue({ pods: [{ id: 'p1', pod_title: 'Hike' }] });
    const { result } = renderHook(() => useHostPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pods).toHaveLength(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { host_user_id: 'u1' },
      { auth: true },
    );
  });

  it('swallows a load failure (list stays empty)', async () => {
    mockUseMe.mockReturnValue({ data: { me: { user_id: 'u1' } } });
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useHostPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pods).toEqual([]);
  });

  it('ignores a resolution after unmount', async () => {
    mockUseMe.mockReturnValue({ data: { me: { user_id: 'u1' } } });
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useHostPods());
    unmount();
    await act(async () => {
      resolve({ pods: [] });
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
