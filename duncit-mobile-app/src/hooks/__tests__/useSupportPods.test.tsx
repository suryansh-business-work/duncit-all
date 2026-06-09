import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useSupportPods } from '@/hooks/useSupportPods';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

beforeEach(() =>
  mockRequest.mockReset().mockResolvedValue({
    myPodMemberships: [
      {
        id: 'm1',
        pod: {
          id: 'p1',
          pod_id: 's1',
          pod_title: 'Pod 1',
          pod_date_time: soon,
          pod_end_date_time: null,
        },
      },
    ],
  }),
);

describe('useSupportPods', () => {
  it('loads options and defaults the selection to the first pod', async () => {
    const { result } = renderHook(() => useSupportPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toHaveLength(1);
    expect(result.current.selectedId).toBe('p1');
    expect(result.current.selected?.title).toBe('Pod 1');
  });

  it('updates the selection', async () => {
    const { result } = renderHook(() => useSupportPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelectedId('nope'));
    expect(result.current.selected).toBeNull();
  });

  it('keeps a far-future joined pod and selects it', async () => {
    const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockRequest.mockReset().mockResolvedValue({
      myPodMemberships: [
        {
          id: 'm1',
          pod: {
            id: 'p1',
            pod_id: 's1',
            pod_title: 'Far',
            pod_date_time: far,
            pod_end_date_time: null,
          },
        },
      ],
    });
    const { result } = renderHook(() => useSupportPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toHaveLength(1);
    expect(result.current.selectedId).toBe('p1');
  });

  it('defaults to an empty selection when there are no joined pods', async () => {
    mockRequest.mockReset().mockResolvedValue({ myPodMemberships: [] });
    const { result } = renderHook(() => useSupportPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(result.current.selectedId).toBe('');
  });

  it('settles with no options when the query fails', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useSupportPods());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
  });

  it('ignores a response that arrives after unmount', async () => {
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockRequest.mockReset().mockReturnValue(
      new Promise((resolve) => {
        resolveQuery = resolve;
      }),
    );
    const { unmount } = renderHook(() => useSupportPods());
    unmount();
    await act(async () => {
      resolveQuery({ myPodMemberships: [] });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
