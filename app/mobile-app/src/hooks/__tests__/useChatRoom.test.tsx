import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  ClubMessagesDocument,
  ClubMessagesPageDocument,
  PodMessagesDocument,
  PodMessagesPageDocument,
  ReactToPodMessageDocument,
  SendPodMessageDocument,
} from '@/graphql/chat';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useChatRoom } from '@/hooks/useChatRoom';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

let socketArgs: {
  onMessage: (m: unknown) => void;
  onReaction: (m: unknown) => void;
  onDeleted: (m: unknown) => void;
  onError: (m: string) => void;
};
jest.mock('@/hooks/usePodSocket', () => ({
  usePodSocket: (args: typeof socketArgs) => {
    socketArgs = args;
  },
}));

// The read mark and the ping are their own modules (tested there); here only
// when the room asks for them matters.
const mockMarkRead = jest.fn();
jest.mock('@/hooks/useMarkChatRead', () => ({ useMarkChatRead: () => mockMarkRead }));
const mockPing = jest.fn();
jest.mock('@/services/chat-sound', () => ({ pingForMessage: (id: string) => mockPing(id) }));

const req = graphqlRequest as jest.Mock;

const msg = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  pod_id: 'p1',
  user_id: 'u',
  user_name: 'A',
  user_photo: null,
  type: 'TEXT',
  text: 't',
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: '2026-06-09T08:00:00Z',
  ...over,
});

function withDocs(messages: unknown[] = []) {
  req.mockImplementation((doc: unknown) => {
    if (doc === PodMessagesDocument)
      return Promise.resolve({
        podMessages: messages,
        // An upcoming pod's open room: the server's room facts ride with the page.
        pod: { pod_date_time: '2099-01-01T10:00:00Z', pod_end_date_time: null },
        podChatInfo: { closed: false, chat_deletes_at: null, can_moderate: false },
      });
    if (doc === UploadImageDocument)
      return Promise.resolve({ uploadImageToImagekit: { url: 'http://img/x.jpg', fileId: 'f' } });
    if (doc === SendPodMessageDocument) return Promise.resolve({ sendPodMessage: { id: 'new' } });
    if (doc === ReactToPodMessageDocument)
      return Promise.resolve({
        reactToPodMessage: { id: 'm1', reactions: [{ user_id: 'u', emoji: '👍' }] },
      });
    return Promise.resolve({});
  });
}

async function mountLoaded(messages: unknown[] = []) {
  withDocs(messages);
  const view = renderHook(() => useChatRoom('p1'));
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

beforeEach(() => {
  req.mockReset();
  socketArgs = undefined as never;
});

describe('useChatRoom', () => {
  it('loads initial messages', async () => {
    const { result } = await mountLoaded([msg('m1')]);
    expect(result.current.messages).toHaveLength(1);
  });

  it('captures a load error', async () => {
    req.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useChatRoom('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('nope');
  });

  it('merges socket message, reaction and deletion updates', async () => {
    const { result } = await mountLoaded([msg('m1')]);

    act(() => socketArgs.onMessage(msg('m2')));
    expect(result.current.messages).toHaveLength(2);
    act(() => socketArgs.onMessage(msg('m2'))); // dedupe
    expect(result.current.messages).toHaveLength(2);

    act(() => socketArgs.onReaction({ id: 'm1', reactions: [{ user_id: 'u', emoji: '🔥' }] }));
    expect(result.current.messages[0]?.reactions).toHaveLength(1);

    act(() => socketArgs.onDeleted(msg('m1')));
    expect(result.current.messages.find((m) => m.id === 'm1')?.deleted).toBe(true);

    act(() => socketArgs.onError('socket boom'));
    expect(result.current.error).toBe('socket boom');
  });

  it('sends text and ignores blank input', async () => {
    const { result } = await mountLoaded();
    await act(async () => {
      await result.current.sendText('   ');
    });
    expect(req).toHaveBeenCalledTimes(1); // only the initial load
    await act(async () => {
      await result.current.sendText('hello');
    });
    expect(req).toHaveBeenCalledWith(
      SendPodMessageDocument,
      expect.objectContaining({ text: 'hello' }),
      { auth: true },
    );
  });

  it('surfaces a send error', async () => {
    const { result } = await mountLoaded();
    req.mockRejectedValueOnce(new Error('send fail'));
    await act(async () => {
      await result.current.sendText('hi');
    });
    expect(result.current.error).toBe('send fail');
  });

  it('uploads then sends an image, and ignores empty assets', async () => {
    const { result } = await mountLoaded();
    await act(async () => {
      await result.current.sendImage({ base64: null });
    });
    expect(req).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.sendImage({ base64: 'abc', fileName: 'p.jpg', mimeType: 'image/png' });
    });
    expect(req).toHaveBeenCalledWith(
      UploadImageDocument,
      expect.objectContaining({ folder: '/chat', mimeType: 'image/png' }),
      { auth: true },
    );
    expect(req).toHaveBeenCalledWith(
      SendPodMessageDocument,
      expect.objectContaining({ imageUrl: 'http://img/x.jpg' }),
      { auth: true },
    );
  });

  it('defaults image filename/mime and surfaces upload errors', async () => {
    const { result } = await mountLoaded();
    await act(async () => {
      await result.current.sendImage({ base64: 'abc' });
    });
    expect(req).toHaveBeenCalledWith(
      UploadImageDocument,
      expect.objectContaining({ mimeType: 'image/jpeg' }),
      { auth: true },
    );
    req.mockRejectedValueOnce(new Error('up fail'));
    await act(async () => {
      await result.current.sendImage({ base64: 'abc' });
    });
    expect(result.current.error).toBe('up fail');
  });

  it('reacts and surfaces react errors', async () => {
    const { result } = await mountLoaded([msg('m1')]);
    await act(async () => {
      await result.current.react('m1', '👍');
    });
    expect(result.current.messages[0]?.reactions).toHaveLength(1);
    req.mockRejectedValueOnce(new Error('react fail'));
    await act(async () => {
      await result.current.react('m1', '👍');
    });
    expect(result.current.error).toBe('react fail');
  });

  it('ignores a load that resolves after unmount', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    req.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount, result } = renderHook(() => useChatRoom('p1'));
    unmount();
    await act(async () => {
      resolve({ podMessages: [msg('m1')] });
    });
    expect(result.current.messages).toEqual([]);
  });

  describe('scroll-up history', () => {
    /** A full page of lines `from`..`from + 29`, oldest first, minutes as timestamps. */
    const page = (from: number, size = 30) =>
      Array.from({ length: size }, (_, i) =>
        msg(`m${from + i}`, {
          createdAt: `2026-06-09T08:${String(from + i).padStart(2, '0')}:00Z`,
        }),
      );

    it('opens a pod room on its newest page of 30, with no cursor', async () => {
      const { result } = await mountLoaded(page(30));
      expect(req).toHaveBeenCalledWith(
        PodMessagesDocument,
        { podId: 'p1', limit: 30 },
        { auth: true },
      );
      expect(result.current.history.hasOlder).toBe(true);
    });

    it('puts the older page in front of the room, and live lines still land at the end', async () => {
      withDocs(page(30));
      const older = page(0);
      const base = req.getMockImplementation();
      req.mockImplementation((doc: unknown, vars: unknown) =>
        doc === PodMessagesPageDocument
          ? Promise.resolve({ podMessages: older })
          : base?.(doc, vars),
      );
      const { result } = renderHook(() => useChatRoom('p1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.history.loadOlder();
      });
      expect(req).toHaveBeenCalledWith(
        PodMessagesPageDocument,
        { podId: 'p1', limit: 30, before: '2026-06-09T08:30:00Z' },
        { auth: true },
      );
      expect(result.current.messages.map((m) => m.id).slice(0, 2)).toEqual(['m0', 'm1']);
      expect(result.current.messages).toHaveLength(60);

      act(() => socketArgs.onMessage(msg('live')));
      expect(result.current.messages.at(-1)?.id).toBe('live');
      expect(result.current.messages).toHaveLength(61);
    });

    it('pages a club room through its own lean query', async () => {
      req.mockImplementation((doc: unknown) => {
        if (doc === ClubMessagesDocument)
          return Promise.resolve({
            clubMessages: page(30),
            clubChatRoom: { club_name: 'Run Club', retention_days: 30, can_moderate: true },
          });
        if (doc === ClubMessagesPageDocument) return Promise.resolve({ clubMessages: page(20, 5) });
        return Promise.resolve({});
      });
      const { result } = renderHook(() => useChatRoom('c1', 'CLUB'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(req).toHaveBeenCalledWith(
        ClubMessagesDocument,
        { clubId: 'c1', limit: 30 },
        { auth: true },
      );
      expect(result.current.roomTitle).toBe('Run Club');

      await act(async () => {
        await result.current.history.loadOlder();
      });
      expect(req).toHaveBeenCalledWith(
        ClubMessagesPageDocument,
        { clubId: 'c1', limit: 30, before: '2026-06-09T08:30:00Z' },
        { auth: true },
      );
      // Five lines is a short page: the start of the room, so no more asks.
      expect(result.current.history.hasOlder).toBe(false);
      expect(result.current.messages[0]?.id).toBe('m20');
    });

    it('expects no older page after a short first page', async () => {
      const { result } = await mountLoaded([msg('m1')]);
      expect(result.current.history.hasOlder).toBe(false);
    });
  });

  it('ignores a load that rejects after unmount', async () => {
    let reject: (err: unknown) => void = () => undefined;
    req.mockReturnValueOnce(
      new Promise((_resolve, rj) => {
        reject = rj;
      }),
    );
    const { unmount, result } = renderHook(() => useChatRoom('p1'));
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
    expect(result.current.error).toBeNull();
  });

  describe('a line arriving while the room is open', () => {
    const mountAs = async (reader: { meId?: string; muted?: boolean }) => {
      withDocs([]);
      const view = renderHook(() => useChatRoom('p1', 'POD', { current: reader }));
      await waitFor(() => expect(view.result.current.isLoading).toBe(false));
      mockPing.mockClear();
      mockMarkRead.mockClear();
      return view;
    };

    it('pings and marks the room read for a line from someone else', async () => {
      await mountAs({ meId: 'me' });
      act(() => socketArgs.onMessage(msg('n1', { user_id: 'other' })));
      expect(mockPing).toHaveBeenCalledWith('n1');
      expect(mockMarkRead).toHaveBeenCalledTimes(1);
    });

    it('stays silent for my own line, and does not mark it', async () => {
      await mountAs({ meId: 'me' });
      act(() => socketArgs.onMessage(msg('n2', { user_id: 'me' })));
      expect(mockPing).not.toHaveBeenCalled();
      expect(mockMarkRead).not.toHaveBeenCalled();
    });

    it('marks a muted room read but never pings in it', async () => {
      await mountAs({ meId: 'me', muted: true });
      act(() => socketArgs.onMessage(msg('n3', { user_id: 'other' })));
      expect(mockPing).not.toHaveBeenCalled();
      expect(mockMarkRead).toHaveBeenCalledTimes(1);
    });
  });

  it('sends a reply with its mentions and says whether it was sent', async () => {
    const { result } = await mountLoaded();
    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendText('yes @Ravi', { replyToId: 'm0', mentions: ['u2'] });
    });
    expect(sent).toBe(true);
    expect(req).toHaveBeenCalledWith(
      SendPodMessageDocument,
      expect.objectContaining({ text: 'yes @Ravi', replyToId: 'm0', mentions: ['u2'] }),
      { auth: true },
    );
    req.mockRejectedValueOnce(new Error('send fail'));
    await act(async () => {
      sent = await result.current.sendText('again');
    });
    expect(sent).toBe(false);
  });

  it('reads the pod title and the mute off the room', async () => {
    req.mockImplementation((doc: unknown) =>
      doc === PodMessagesDocument
        ? Promise.resolve({
            podMessages: [],
            pod: {
              pod_title: 'Sunday run',
              pod_date_time: '2099-01-01T10:00:00Z',
              pod_end_date_time: null,
            },
            podChatInfo: {
              closed: false,
              chat_deletes_at: null,
              can_moderate: false,
              is_muted: true,
              muted_until: null,
            },
          })
        : Promise.resolve({}),
    );
    const { result } = renderHook(() => useChatRoom('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roomTitle).toBe('Sunday run');
    expect(result.current.mute).toMatchObject({ is_muted: true, muted_until: null });
  });
});
