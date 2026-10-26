import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { VenueChatReadMark } from '@duncit/utils';

import { PodMessageType, VenueChatSide } from '@/generated/graphql/graphql';
import {
  SendVenueChatMessageDocument,
  VenueChatMessagesDocument,
  VenueChatRoomDocument,
} from '@/graphql/venue-chat';
import { uploadChatImage } from '@/hooks/useChatRoom';
import { useVenueChat } from '@/hooks/useVenueChat';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';
import { venueChatLine, venueChatRoomFixture } from '@/utils/venue-offer-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useChatRoom', () => ({ uploadChatImage: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockUpload = uploadChatImage as jest.Mock;

const venueMark = {
  user_id: 'owner-1',
  side: VenueChatSide.Venue,
  name: 'Court House',
  photo: null,
  last_read_at: '2026-08-29T10:00:00.000Z',
};
const room = venueChatRoomFixture({ read_marks: [venueMark] });
const first = venueChatLine({ id: 'l1', createdAt: '2026-08-29T10:00:00.000Z' });
const second = venueChatLine({ id: 'l2', user_id: 'u1', createdAt: '2026-08-29T10:01:00.000Z' });

/** Answers the thread's two reads; a send answers with `sent`. */
const serve = (sent = venueChatLine({ id: 'l3', createdAt: '2026-08-29T10:05:00.000Z' })) =>
  mockRequest.mockImplementation((document: unknown) => {
    if (document === VenueChatRoomDocument) return Promise.resolve({ venueChatRoom: room });
    if (document === VenueChatMessagesDocument)
      return Promise.resolve({ venueChatMessages: [first, second] });
    if (document === SendVenueChatMessageDocument)
      return Promise.resolve({ sendVenueChatMessage: sent });
    return Promise.resolve({});
  });

const mountThread = async () => {
  const hook = renderHook(() => useVenueChat('pod-1'));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
};

beforeEach(() => {
  mockRequest.mockReset();
  mockUpload.mockReset();
  serve();
});

describe('useVenueChat', () => {
  it('reads the thread, its newest page — which marks it read — and how far the others have read', async () => {
    const { result } = await mountThread();
    expect(result.current.room).toEqual(room);
    expect(result.current.messages.map((line) => line.id)).toEqual(['l1', 'l2']);
    expect(result.current.marks).toEqual([venueMark]);
    expect(mockRequest).toHaveBeenCalledWith(
      VenueChatMessagesDocument,
      { podId: 'pod-1', limit: 50 },
      { auth: true },
    );
  });

  it('puts a changed line in place, and leaves out one on a page not loaded', async () => {
    const { result } = await mountThread();
    const edited = { ...first, text: 'See you at 7', edited_at: '2026-08-29T10:02:00.000Z' };
    act(() => result.current.replaceLine(edited));
    expect(result.current.messages[0]).toEqual(edited);
    act(() =>
      result.current.replaceLine(venueChatLine({ id: 'old', createdAt: '2026-08-01T00:00:00Z' })),
    );
    expect(result.current.messages.map((line) => line.id)).toEqual(['l1', 'l2']);
  });

  it('takes a removed line out, and adds new lines once each', async () => {
    const { result } = await mountThread();
    act(() => result.current.removeLine('l1'));
    expect(result.current.messages.map((line) => line.id)).toEqual(['l2']);
    const late = venueChatLine({ id: 'l4', createdAt: '2026-08-29T10:09:00.000Z' });
    act(() => result.current.addLines([late, late]));
    expect(result.current.messages.map((line) => line.id)).toEqual(['l2', 'l4']);
  });

  it("moves a member's read mark forward only", async () => {
    const { result } = await mountThread();
    const later = { ...venueMark, last_read_at: '2026-08-29T10:01:00.000Z' };
    act(() => result.current.addMark(later));
    expect(result.current.marks).toEqual([later]);
    act(() => result.current.addMark(venueMark));
    expect(result.current.marks).toEqual([later]);
    const host: VenueChatReadMark = { ...venueMark, user_id: 'host-2', side: 'HOST' };
    act(() => result.current.addMark(host));
    expect(result.current.marks).toHaveLength(2);
  });

  it('closes a thread that is not the reader’s, and only fails one that did not load', async () => {
    mockRequest.mockRejectedValue(new ApiError('No', 403, { code: 'FORBIDDEN' }));
    const closed = renderHook(() => useVenueChat('pod-1'));
    await waitFor(() => expect(closed.result.current.isLoading).toBe(false));
    expect(closed.result.current.unavailable).toBe(true);
    expect(closed.result.current.loadFailed).toBe(true);

    mockRequest.mockRejectedValue(new Error('offline'));
    const failed = renderHook(() => useVenueChat('pod-2'));
    await waitFor(() => expect(failed.result.current.isLoading).toBe(false));
    expect(failed.result.current.unavailable).toBe(false);
    expect(failed.result.current.loadFailed).toBe(true);
  });

  it('sends a trimmed line and adds the answer, sends nothing blank, and keeps a refused one', async () => {
    const { result } = await mountThread();
    let sent = false;
    await act(async () => {
      sent = await result.current.sendText('  Hello  ');
    });
    expect(sent).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(
      SendVenueChatMessageDocument,
      { podId: 'pod-1', type: PodMessageType.Text, text: 'Hello' },
      { auth: true },
    );
    expect(result.current.messages.at(-1)?.id).toBe('l3');

    await act(async () => {
      sent = await result.current.sendText('   ');
    });
    expect(sent).toBe(false);

    mockRequest.mockRejectedValue(new Error('No phone numbers'));
    await act(async () => {
      sent = await result.current.sendText('Call me');
    });
    expect(sent).toBe(false);
    expect(result.current.error).toBe('No phone numbers');
  });

  it('uploads a photo and posts it, and says why one could not be sent', async () => {
    mockUpload.mockResolvedValue('https://ik.imagekit.io/duncit/chat/p.jpg');
    const { result } = await mountThread();
    await act(async () => {
      await result.current.sendImage({ base64: 'AAA', fileName: 'p.jpg', mimeType: 'image/jpeg' });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      SendVenueChatMessageDocument,
      {
        podId: 'pod-1',
        type: PodMessageType.Image,
        imageUrl: 'https://ik.imagekit.io/duncit/chat/p.jpg',
      },
      { auth: true },
    );
    expect(result.current.sending).toBe(false);

    // A photo the picker could not read is not sent.
    mockRequest.mockClear();
    await act(async () => {
      await result.current.sendImage({ base64: null });
    });
    expect(mockRequest).not.toHaveBeenCalled();

    mockUpload.mockRejectedValue(new Error(''));
    await act(async () => {
      await result.current.sendImage({ base64: 'BBB' });
    });
    expect(result.current.error).toBe('Could not send your message.');
  });
});
