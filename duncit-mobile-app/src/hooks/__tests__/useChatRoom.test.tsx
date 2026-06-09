import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  PodMessagesDocument,
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
    if (doc === PodMessagesDocument) return Promise.resolve({ podMessages: messages });
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
});
