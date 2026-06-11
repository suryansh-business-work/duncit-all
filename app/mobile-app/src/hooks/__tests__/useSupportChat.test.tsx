import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';

import { useSupportChat } from '@/hooks/useSupportChat';
import { graphqlRequest } from '@/services/graphql.client';
import { getAuthToken } from '@/services/auth-token';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockIo = io as jest.Mock;
const mockToken = getAuthToken as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;

type Handler = (...args: unknown[]) => void;
function fakeSocket() {
  const handlers = new Map<string, Handler>();
  return {
    on: jest.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    fire: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
}

const msg = (id: string, sessionId = 's1', over: Record<string, unknown> = {}) => ({
  id,
  session_id: sessionId,
  sender_id: 'u1',
  sender_role: 'USER',
  sender_name: 'Test',
  sender_photo: null,
  text: `msg-${id}`,
  attachments: [],
  created_at: new Date().toISOString(),
  ...over,
});

/** Boot responses: startSupportChat → messages → markRead. */
function mockBoot() {
  mockRequest.mockImplementation((doc: unknown, vars: Record<string, unknown> | undefined) => {
    const body = JSON.stringify(doc);
    if (body.includes('startSupportChat')) {
      return Promise.resolve({ startSupportChat: { id: 's1', status: 'OPEN' } });
    }
    if (body.includes('supportChatMessages')) {
      return Promise.resolve({ supportChatMessages: [msg('m1')] });
    }
    if (body.includes('markSupportChatRead')) {
      return Promise.resolve({ markSupportChatRead: { id: 's1', unread_for_user: 0 } });
    }
    if (body.includes('sendSupportChatMessage')) {
      return Promise.resolve({
        sendSupportChatMessage: msg('m2', 's1', { text: (vars as any)?.text ?? '' }),
      });
    }
    if (body.includes('uploadImageToImagekit')) {
      return Promise.resolve({ uploadImageToImagekit: { url: 'https://img/up.jpg', fileId: 'f' } });
    }
    return Promise.resolve({});
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockToken.mockResolvedValue('jwt');
});

describe('useSupportChat', () => {
  it('boots the session, loads history and joins the socket room', async () => {
    mockBoot();
    const socket = fakeSocket();
    mockIo.mockReturnValue(socket);

    const { result, unmount } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessionId).toBe('s1');
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1']);

    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    act(() => socket.fire('connect'));
    expect(socket.emit).toHaveBeenCalledWith('join_support_session', 's1');

    // Live message for this session appends once (duplicates ignored).
    act(() => socket.fire('support_chat:message', msg('m9')));
    act(() => socket.fire('support_chat:message', msg('m9')));
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm9']);

    // A message for another session is ignored.
    act(() => socket.fire('support_chat:message', msg('mx', 'other')));
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm9']);

    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_support_session', 's1');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('sends a text message and appends the response', async () => {
    mockBoot();
    mockIo.mockReturnValue(fakeSocket());
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.send('hello');
    });
    expect(result.current.messages.some((m) => m.id === 'm2')).toBe(true);

    // Empty sends are no-ops.
    await act(async () => {
      await result.current.send('   ');
    });
    expect(result.current.messages.filter((m) => m.id === 'm2')).toHaveLength(1);
  });

  it('uploads a picked image and returns its URL', async () => {
    mockBoot();
    mockIo.mockReturnValue(fakeSocket());
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = await result.current.uploadImage({
      base64: 'abc',
      fileName: 'x.jpg',
      mimeType: 'image/jpeg',
    });
    expect(url).toBe('https://img/up.jpg');
    await expect(result.current.uploadImage({ base64: null })).rejects.toThrow(/no image/i);
  });

  it('surfaces a boot failure', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('offline');
  });

  it('falls back to a generic boot error for non-Error failures', async () => {
    mockRequest.mockRejectedValue('weird');
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Could not open the chat.');
  });

  it('swallows a mark-read failure on boot', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('startSupportChat')) {
        return Promise.resolve({ startSupportChat: { id: 's1', status: 'OPEN' } });
      }
      if (body.includes('supportChatMessages')) {
        return Promise.resolve({ supportChatMessages: [] });
      }
      if (body.includes('markSupportChatRead')) return Promise.reject(new Error('nope'));
      return Promise.resolve({});
    });
    mockIo.mockReturnValue(fakeSocket());
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('');
  });

  it('send is a no-op before the session exists and upload uses default names', async () => {
    // Boot fails → sessionId stays empty → send must not call the API.
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockClear();
    await act(async () => {
      await result.current.send('hello');
    });
    expect(mockRequest).not.toHaveBeenCalled();

    // uploadImage falls back to jpeg + generated name when the asset has none.
    mockRequest.mockResolvedValue({
      uploadImageToImagekit: { url: 'https://img/u.jpg', fileId: 'f' },
    });
    const url = await result.current.uploadImage({ base64: 'abc' });
    expect(url).toBe('https://img/u.jpg');
    const vars = mockRequest.mock.calls[0][1] as Record<string, string>;
    expect(vars.mimeType).toBe('image/jpeg');
    expect(vars.fileName).toMatch(/^chat-\d+\.jpg$/);
  });

  it('ignores boot results after unmount', async () => {
    let resolveStart: (v: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('startSupportChat')) {
        return new Promise((resolve) => {
          resolveStart = resolve;
        });
      }
      return Promise.resolve({ supportChatMessages: [] });
    });
    const { unmount } = renderHook(() => useSupportChat());
    unmount();
    await act(async () => {
      resolveStart({ startSupportChat: { id: 's1', status: 'OPEN' } });
      await Promise.resolve();
    });
    // No throw / no further activity — the cancelled guards swallowed the result.
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('sends an attachment-only message and skips duplicates already streamed', async () => {
    mockBoot();
    mockIo.mockReturnValue(fakeSocket());
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Attachment-only → text resolves to null.
    await act(async () => {
      await result.current.send('', ['https://img/a.jpg']);
    });
    const sendVars = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('sendSupportChatMessage'),
    )?.[1] as Record<string, unknown>;
    expect(sendVars.text).toBeNull();

    // Sending again returns the same id (already appended) → list unchanged.
    const before = result.current.messages.length;
    await act(async () => {
      await result.current.send('dup');
    });
    expect(result.current.messages.length).toBe(before);
  });

  it('drops boot results that resolve mid-unmount (messages + failure paths)', async () => {
    // Unmount between the session start and the history fetch.
    let resolveMessages: (v: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('startSupportChat')) {
        return Promise.resolve({ startSupportChat: { id: 's1', status: 'OPEN' } });
      }
      if (body.includes('supportChatMessages')) {
        return new Promise((resolve) => {
          resolveMessages = resolve;
        });
      }
      return Promise.resolve({});
    });
    mockIo.mockReturnValue(fakeSocket());
    const first = renderHook(() => useSupportChat());
    await waitFor(() => expect(first.result.current.sessionId).toBe('s1'));
    first.unmount();
    await act(async () => {
      resolveMessages({ supportChatMessages: [msg('late')] });
      await Promise.resolve();
    });

    // And a failure that lands after unmount is swallowed too.
    let rejectMessages: (e: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('startSupportChat')) {
        return Promise.resolve({ startSupportChat: { id: 's2', status: 'OPEN' } });
      }
      if (body.includes('supportChatMessages')) {
        return new Promise((_resolve, reject) => {
          rejectMessages = reject;
        });
      }
      return Promise.resolve({});
    });
    const second = renderHook(() => useSupportChat());
    await waitFor(() => expect(second.result.current.sessionId).toBe('s2'));
    second.unmount();
    await act(async () => {
      rejectMessages(new Error('late failure'));
      await Promise.resolve();
    });
  });

  it('skips the socket when there is no stored token', async () => {
    mockBoot();
    mockToken.mockResolvedValue(null);
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => Promise.resolve());
    expect(mockIo).not.toHaveBeenCalled();
  });
});
