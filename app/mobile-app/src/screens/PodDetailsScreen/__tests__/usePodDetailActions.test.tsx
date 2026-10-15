import { act, renderHook } from '@testing-library/react-native';

import { JoinFreePodDocument, JoinPodMeetingDocument } from '@/graphql/details';
import type { PodDetail } from '@/hooks/useDetails';
import { graphqlRequest } from '@/services/graphql.client';
import { usePodDetailActions } from '@/screens/PodDetailsScreen/usePodDetailActions';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/share-link', () => ({ podShareLinks: jest.fn() }));

const mockRequest = jest.mocked(graphqlRequest);
const pod = { id: 'p1', pod_title: 'Sunset Run' } as unknown as PodDetail;
const refetch = jest.fn(() => Promise.resolve());

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usePodDetailActions — joining a virtual pod', () => {
  it('asks the server for the meeting link, re-reads the pod and hands the link back', async () => {
    mockRequest.mockResolvedValueOnce({
      joinPodMeeting: { meeting_url: 'https://meet.example/abc' },
    });
    const { result } = renderHook(() => usePodDetailActions(pod, refetch));

    let url: string | null | undefined;
    await act(async () => {
      url = await result.current.onJoinMeeting('p1');
    });

    expect(url).toBe('https://meet.example/abc');
    expect(mockRequest).toHaveBeenCalledWith(
      JoinPodMeetingDocument,
      { podId: 'p1' },
      { auth: true },
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('lets the caller see a refused meeting link, without a re-read', async () => {
    mockRequest.mockRejectedValueOnce(new Error('The pod has not started yet'));
    const { result } = renderHook(() => usePodDetailActions(pod, refetch));

    await act(async () => {
      await expect(result.current.onJoinMeeting('p1')).rejects.toThrow(
        'The pod has not started yet',
      );
    });
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe('usePodDetailActions — joining a free pod', () => {
  it('does nothing before the pod has loaded', async () => {
    const { result } = renderHook(() => usePodDetailActions(null, refetch));

    await act(async () => {
      await result.current.onJoinFree();
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sends one join however often it is tapped while the first is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => usePodDetailActions(pod, refetch));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.onJoinFree();
    });
    await act(async () => {
      await result.current.onJoinFree();
    });
    await act(async () => {
      finish({ joinFreePod: { id: 'm1' } });
      await first;
    });

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      JoinFreePodDocument,
      { podId: 'p1', referral: null, seats: 1 },
      { auth: true },
    );
    expect(mockNavigate).toHaveBeenCalledWith('FreeJoinSuccess', { podId: 'p1' });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the member on the pod with the server's reason when the join fails", async () => {
    mockRequest.mockRejectedValueOnce(new Error('This pod is full'));
    const { result } = renderHook(() => usePodDetailActions(pod, refetch));

    await act(async () => {
      await result.current.onJoinFree();
    });

    expect(result.current.joinError).toBe('This pod is full');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
