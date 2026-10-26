import { act, renderHook } from '@testing-library/react-native';

import {
  DeleteVenueChatMessageDocument,
  EditVenueChatMessageDocument,
  ReactToVenueChatMessageDocument,
} from '@/graphql/venue-chat';
import { useVenueChatLineActions } from '@/hooks/useVenueChatLineActions';
import { graphqlRequest } from '@/services/graphql.client';
import { venueChatLine } from '@/utils/venue-offer-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args), error: jest.fn() } },
}));
const mockRequest = graphqlRequest as jest.Mock;

const mountActions = () => {
  const apply = { replaceLine: jest.fn(), removeLine: jest.fn() };
  const hook = renderHook(() => useVenueChatLineActions(apply));
  return { ...hook, apply };
};

beforeEach(() => {
  mockRequest.mockReset();
  mockWarn.mockReset();
});

describe('useVenueChatLineActions', () => {
  it('reacts to a line and puts the line as everyone now sees it in place', async () => {
    const reacted = venueChatLine({ id: 'l1', reactions: [{ user_id: 'u1', emoji: '🎉' }] });
    mockRequest.mockResolvedValue({ reactToVenueChatMessage: reacted });
    const { result, apply } = mountActions();
    let refused: string | null = 'pending';
    await act(async () => {
      refused = await result.current.react('l1', '🎉');
    });
    expect(refused).toBeNull();
    expect(mockRequest).toHaveBeenCalledWith(
      ReactToVenueChatMessageDocument,
      { messageId: 'l1', emoji: '🎉' },
      { auth: true },
    );
    expect(apply.replaceLine).toHaveBeenCalledWith(reacted);
  });

  it('rewrites a line and shows it edited', async () => {
    const edited = venueChatLine({
      id: 'l1',
      text: 'See you at 7',
      edited_at: '2026-08-29T10:02:00Z',
    });
    mockRequest.mockResolvedValue({ editVenueChatMessage: edited });
    const { result, apply } = mountActions();
    await act(async () => {
      await result.current.edit('l1', 'See you at 7');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      EditVenueChatMessageDocument,
      { messageId: 'l1', text: 'See you at 7' },
      { auth: true },
    );
    expect(apply.replaceLine).toHaveBeenCalledWith(edited);
  });

  it('takes a deleted line out of the thread', async () => {
    mockRequest.mockResolvedValue({ deleteVenueChatMessage: true });
    const { result, apply } = mountActions();
    await act(async () => {
      await result.current.remove('l1');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      DeleteVenueChatMessageDocument,
      { messageId: 'l1' },
      { auth: true },
    );
    expect(apply.removeLine).toHaveBeenCalledWith('l1');
  });

  it("answers the server's reason for a refusal, logs it and changes nothing", async () => {
    mockRequest.mockRejectedValue(new Error('Messages cannot share phone numbers'));
    const { result, apply } = mountActions();
    let refused: string | null = null;
    await act(async () => {
      refused = await result.current.edit('l1', 'Call 9000000000');
    });
    expect(refused).toBe('Messages cannot share phone numbers');
    expect(apply.replaceLine).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('venueChat', 'edit', {
      error: expect.any(Error),
      message_id: 'l1',
    });
  });

  it('falls back to a plain sentence for a refusal with no message', async () => {
    mockRequest.mockRejectedValue(new Error(''));
    const { result, apply } = mountActions();
    let refused: string | null = null;
    await act(async () => {
      refused = await result.current.remove('l1');
    });
    expect(refused).toBe('That did not go through. Please try again.');
    expect(apply.removeLine).not.toHaveBeenCalled();
  });
});
