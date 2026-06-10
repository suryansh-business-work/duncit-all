import { renderHook } from '@testing-library/react-native';

import { useChatRooms } from '@/hooks/useChat';

const mockChatState = { data: { myChatRooms: [{ id: 'r1' }] }, isLoading: false, fetch: jest.fn() };
jest.mock('@/stores/chat.store', () => ({
  useChatStore: (selector: (s: unknown) => unknown) => selector(mockChatState),
}));

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
