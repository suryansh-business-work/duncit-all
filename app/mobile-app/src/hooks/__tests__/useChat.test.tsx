import { renderHook, waitFor } from '@testing-library/react-native';

import { useChatParticipants, useChatRooms } from '@/hooks/useChat';
import { graphqlRequest } from '@/services/graphql.client';

const mockChatState = { data: { myChatRooms: [{ id: 'r1' }] }, isLoading: false, fetch: jest.fn() };
jest.mock('@/stores/chat.store', () => ({
  useChatStore: (selector: (s: unknown) => unknown) => selector(mockChatState),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

describe('useChatRooms', () => {
  it('exposes the rooms', () => {
    expect(renderHook(() => useChatRooms()).result.current.rooms).toHaveLength(1);
  });

  it('refetches with force and copes with an empty store', () => {
    const first = renderHook(() => useChatRooms());
    first.result.current.refetch();
    expect(mockChatState.fetch).toHaveBeenCalledWith(true);

    mockChatState.data = undefined as never;
    const second = renderHook(() => useChatRooms());
    expect(second.result.current.rooms).toEqual([]);
    expect(second.result.current.hasData).toBe(false);
  });
});

describe('useChatParticipants', () => {
  beforeEach(() => mockRequest.mockReset());

  it('loads hosts, participants and the count for a pod', async () => {
    mockRequest.mockResolvedValue({
      chatParticipants: {
        participant_count: 2,
        hosts: [{ user_id: 'h1', full_name: 'Asha', profile_photo: null }],
        participants: [
          { user_id: 'u1', full_name: 'Ben', profile_photo: null },
          { user_id: 'u2', full_name: 'Cara', profile_photo: null },
        ],
      },
    });
    const { result } = renderHook(() => useChatParticipants('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hosts).toHaveLength(1);
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.count).toBe(2);
  });

  it('falls back to empty data when the request fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useChatParticipants('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hosts).toEqual([]);
    expect(result.current.participants).toEqual([]);
    expect(result.current.count).toBe(0);
  });
});
