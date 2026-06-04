import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useChatRooms, usePodMessages } from '@/hooks/useChat';

const mockChatState = { data: { myChatRooms: [{ id: 'r1' }] }, isLoading: false, fetch: jest.fn() };
jest.mock('@/stores/chat.store', () => ({
  useChatStore: (selector: (s: unknown) => unknown) => selector(mockChatState),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useChat', () => {
  it('useChatRooms exposes the rooms', () => {
    expect(renderHook(() => useChatRooms()).result.current.rooms).toHaveLength(1);
  });

  it('usePodMessages loads messages', async () => {
    mockRequest.mockResolvedValueOnce({ podMessages: [{ id: 'm1' }] });
    const { result } = renderHook(() => usePodMessages('pod1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.messages).toHaveLength(1);
  });

  it('usePodMessages captures errors', async () => {
    mockRequest.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => usePodMessages('pod2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});
