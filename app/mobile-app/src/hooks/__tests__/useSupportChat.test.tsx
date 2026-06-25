import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system/legacy';

import { useSupportChat } from '@/hooks/useSupportChat';
import { graphqlRequest } from '@/services/graphql.client';
import { getAuthToken } from '@/services/auth-token';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

const mockIo = io as jest.Mock;
const mockToken = getAuthToken as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;
const mockRead = FileSystem.readAsStringAsync as jest.Mock;

type Handler = (...args: unknown[]) => void;
function fakeSocket() {
  const handlers = new Map<string, Handler>();
  return {
    on: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
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
  is_ai: false,
  created_at: new Date().toISOString(),
  ...over,
});

function mockBoot() {
  mockRequest.mockImplementation((doc: unknown, vars: Record<string, unknown> | undefined) => {
    const body = JSON.stringify(doc);
    if (body.includes('startSupportChat')) {
      return Promise.resolve({
        startSupportChat: {
          id: 's1',
          ticket_no: 'CH-AAA111',
          status: 'OPEN',
          ai_active: true,
          agent_id: null,
          agent_last_read_at: null,
        },
      });
    }
    if (body.includes('supportChatMessages'))
      return Promise.resolve({ supportChatMessages: [msg('m1')] });
    if (body.includes('markSupportChatRead')) {
      return Promise.resolve({
        markSupportChatRead: { id: 's1', unread_for_user: 0, agent_last_read_at: null },
      });
    }
    if (body.includes('sendSupportChatMessage')) {
      return Promise.resolve({
        sendSupportChatMessage: msg('m2', 's1', { text: (vars as any)?.text ?? '' }),
      });
    }
    if (body.includes('uploadImageToImagekit')) {
      return Promise.resolve({ uploadImageToImagekit: { url: 'https://img/up.jpg', fileId: 'f' } });
    }
    if (body.includes('resolveSupportChat'))
      return Promise.resolve({ resolveSupportChat: { id: 's1', status: 'CLOSED' } });
    if (body.includes('reopenSupportChat'))
      return Promise.resolve({ reopenSupportChat: { id: 's1', status: 'OPEN' } });
    if (body.includes('submitSupportChatFeedback'))
      return Promise.resolve({ submitSupportChatFeedback: { id: 's1', rating: 5 } });
    if (body.includes('supportChatTranscript')) {
      return Promise.resolve({
        supportChatTranscript: { filename: 'support-CH-AAA111.txt', text: 'transcript' },
      });
    }
    if (body.includes('emailSupportChatTranscript'))
      return Promise.resolve({ emailSupportChatTranscript: true });
    return Promise.resolve({});
  });
}

async function bootedHook() {
  mockBoot();
  const socket = fakeSocket();
  mockIo.mockReturnValue(socket);
  const hook = renderHook(() => useSupportChat());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  await waitFor(() => expect(mockIo).toHaveBeenCalled());
  return { ...hook, socket };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockToken.mockResolvedValue('jwt');
});

describe('useSupportChat', () => {
  it('boots, joins the room and streams live messages / session / typing', async () => {
    const { result, socket, unmount } = await bootedHook();
    expect(result.current.session?.id).toBe('s1');
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1']);

    act(() => socket.fire('connect'));
    expect(socket.emit).toHaveBeenCalledWith('join_support_session', 's1');

    // Live agent message appends once + triggers a read; duplicate ignored.
    act(() => socket.fire('support_chat:message', msg('m9', 's1', { sender_role: 'AGENT' })));
    act(() => socket.fire('support_chat:message', msg('m9', 's1', { sender_role: 'AGENT' })));
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm9']);
    // A live USER message appends but does not trigger a read.
    act(() => socket.fire('support_chat:message', msg('m10', 's1', { sender_role: 'USER' })));
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm9', 'm10']);
    // A message for another session is ignored.
    act(() => socket.fire('support_chat:message', msg('mx', 'other')));
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm9', 'm10']);

    // Session update merges (read receipt) + a foreign update is ignored.
    act(() => socket.fire('support_chat:session_update', { id: 's1', agent_last_read_at: 'NOW' }));
    expect(result.current.session?.agent_last_read_at).toBe('NOW');
    act(() => socket.fire('support_chat:session_update', { id: 'other', agent_last_read_at: 'X' }));
    expect(result.current.session?.agent_last_read_at).toBe('NOW');

    // Typing toggles on then clears, and a foreign typing signal is ignored.
    jest.useFakeTimers();
    act(() => socket.fire('support_typing', { session_id: 's1' }));
    expect(result.current.typing).toBe(true);
    act(() => socket.fire('support_typing', { session_id: 's1' })); // resets the timer
    act(() => socket.fire('support_typing', { session_id: 'other' }));
    act(() => jest.advanceTimersByTime(2500));
    expect(result.current.typing).toBe(false);
    jest.useRealTimers();

    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_support_session', 's1');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('sends optimistically and reconciles the server message', async () => {
    const { result } = await bootedHook();
    await act(async () => {
      await result.current.send('hello');
    });
    expect(result.current.messages.some((m) => m.id === 'm2')).toBe(true);
    expect(result.current.messages.some((m) => m.pending)).toBe(false);

    // Empty send is a no-op.
    await act(async () => {
      await result.current.send('   ');
    });
    expect(result.current.messages.filter((m) => m.id === 'm2')).toHaveLength(1);

    // Attachment-only → text null.
    await act(async () => {
      await result.current.send('', ['https://img/a.jpg']);
    });
    const sendVars = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('sendSupportChatMessage'))
      .at(-1)?.[1] as Record<string, unknown>;
    expect(sendVars.text).toBeNull();
  });

  it('removes the optimistic message and rethrows on a send failure', async () => {
    const { result } = await bootedHook();
    mockRequest.mockImplementation((doc: unknown) => {
      if (JSON.stringify(doc).includes('sendSupportChatMessage'))
        return Promise.reject(new Error('boom'));
      return Promise.resolve({});
    });
    await act(async () => {
      await expect(result.current.send('hi')).rejects.toThrow('boom');
    });
    expect(result.current.messages.some((m) => m.pending)).toBe(false);
    expect(result.current.aiThinking).toBe(false);
  });

  it('shows the assistant thinking while the AI fields the chat, clears on a reply', async () => {
    const { result, socket } = await bootedHook();
    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.aiThinking).toBe(true);
    act(() =>
      socket.fire('support_chat:message', msg('a1', 's1', { sender_role: 'AGENT', is_ai: true })),
    );
    expect(result.current.aiThinking).toBe(false);
  });

  it('does not show thinking once a human agent has joined', async () => {
    const { result, socket } = await bootedHook();
    act(() => socket.fire('support_chat:session_update', { id: 's1', agent_id: 'agent1' }));
    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.aiThinking).toBe(false);
  });

  it('uploads an attachment from base64, from a uri, and rejects when unreadable', async () => {
    const { result } = await bootedHook();

    const byBase64 = await result.current.uploadAttachment({
      base64: 'abc',
      fileName: 'x.jpg',
      mimeType: 'image/jpeg',
    });
    expect(byBase64).toBe('https://img/up.jpg');

    mockRead.mockResolvedValueOnce('vid64');
    const byUri = await result.current.uploadAttachment({
      uri: 'file://v.mp4',
      mimeType: 'video/mp4',
    });
    expect(byUri).toBe('https://img/up.jpg');
    expect(mockRead).toHaveBeenCalledWith('file://v.mp4', { encoding: 'base64' });

    // Default mime + name when absent.
    await result.current.uploadAttachment({ base64: 'abc' });
    const upVars = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('uploadImageToImagekit'))
      .at(-1)?.[1] as Record<string, unknown>;
    expect(upVars.mimeType).toBe('image/jpeg');
    expect(upVars.fileName).toMatch(/^chat-\d+$/);
    expect(upVars.allowDocuments).toBe(false);

    // A document upload forwards allowDocuments + the real mime type (Bug 9).
    await result.current.uploadAttachment(
      { base64: 'pdf64', fileName: 'spec.pdf', mimeType: 'application/pdf' },
      true,
    );
    const docVars = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('uploadImageToImagekit'))
      .at(-1)?.[1] as Record<string, unknown>;
    expect(docVars.allowDocuments).toBe(true);
    expect(docVars.mimeType).toBe('application/pdf');

    await expect(result.current.uploadAttachment({})).rejects.toThrow(/could not read/i);
  });

  it('resolves, reopens, submits feedback, fetches + emails the transcript', async () => {
    const { result } = await bootedHook();

    await act(async () => {
      await result.current.resolve();
    });
    expect(result.current.session?.status).toBe('CLOSED');

    await act(async () => {
      await result.current.reopen('Still need help');
    });
    expect(result.current.session?.status).toBe('OPEN');
    const reopenVars = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('reopenSupportChat'),
    )?.[1] as Record<string, unknown>;
    expect(reopenVars).toEqual({ sessionId: 's1', reason: 'Still need help' });

    // A blank reason is forwarded as null.
    await act(async () => {
      await result.current.reopen('   ');
    });
    const blankReopen = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('reopenSupportChat'))
      .at(-1)?.[1] as Record<string, unknown>;
    expect(blankReopen).toEqual({ sessionId: 's1', reason: null });

    await act(async () => {
      await result.current.submitFeedback(5, 'great');
      await result.current.submitFeedback(4, '   ');
    });
    const fbVars = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('submitSupportChatFeedback'),
    )?.[1] as Record<string, unknown>;
    expect(fbVars.rating).toBe(5);

    const transcript = await result.current.getTranscript();
    expect(transcript?.filename).toContain('CH-AAA111');

    await act(async () => {
      await result.current.emailTranscript('me@x.com');
    });
    const emVars = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('emailSupportChatTranscript'),
    )?.[1] as Record<string, unknown>;
    expect(emVars.email).toBe('me@x.com');
  });

  it('emits typing through the socket once connected', async () => {
    const { result, socket } = await bootedHook();
    act(() => result.current.emitTyping());
    expect(socket.emit).toHaveBeenCalledWith('support_typing', 's1');
  });

  it('surfaces boot failures (Error + non-Error) and swallows mark-read errors', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const first = renderHook(() => useSupportChat());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(first.result.current.error).toBe('offline');

    mockRequest.mockRejectedValue('weird');
    const second = renderHook(() => useSupportChat());
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(second.result.current.error).toBe('Could not open the chat.');

    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('startSupportChat')) {
        return Promise.resolve({
          startSupportChat: {
            id: 's1',
            ticket_no: 'CH',
            status: 'OPEN',
            ai_active: true,
            agent_id: null,
            agent_last_read_at: null,
          },
        });
      }
      if (body.includes('supportChatMessages')) return Promise.resolve({ supportChatMessages: [] });
      if (body.includes('markSupportChatRead')) return Promise.reject(new Error('nope'));
      return Promise.resolve({});
    });
    mockIo.mockReturnValue(fakeSocket());
    const third = renderHook(() => useSupportChat());
    await waitFor(() => expect(third.result.current.isLoading).toBe(false));
    expect(third.result.current.error).toBe('');
  });

  it('no-ops session actions before the session exists and skips the socket without a token', async () => {
    // Boot fails → no session → guards short-circuit.
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useSupportChat());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockClear();
    await act(async () => {
      await result.current.send('hello');
      await result.current.resolve();
      await result.current.reopen('x');
      await result.current.submitFeedback(5, 'x');
      await result.current.emailTranscript('a@b.com');
      result.current.emitTyping();
      expect(await result.current.getTranscript()).toBeNull();
    });
    expect(mockRequest).not.toHaveBeenCalled();

    // No token → never opens the socket.
    mockBoot();
    mockToken.mockResolvedValue(null);
    const noToken = renderHook(() => useSupportChat());
    await waitFor(() => expect(noToken.result.current.isLoading).toBe(false));
    await act(async () => Promise.resolve());
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('swallows a boot error that lands after unmount', async () => {
    let rejectStart: (e: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      if (JSON.stringify(doc).includes('startSupportChat')) {
        return new Promise((_resolve, reject) => {
          rejectStart = reject;
        });
      }
      return Promise.resolve({});
    });
    const { unmount } = renderHook(() => useSupportChat());
    unmount();
    await act(async () => {
      rejectStart(new Error('late boot error'));
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('drops boot results that resolve/reject after unmount', async () => {
    let resolveStart: (v: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      if (JSON.stringify(doc).includes('startSupportChat')) {
        return new Promise((resolve) => {
          resolveStart = resolve;
        });
      }
      return Promise.resolve({ supportChatMessages: [] });
    });
    const a = renderHook(() => useSupportChat());
    a.unmount();
    await act(async () => {
      resolveStart({
        startSupportChat: {
          id: 's1',
          ticket_no: 'CH',
          status: 'OPEN',
          ai_active: true,
          agent_id: null,
          agent_last_read_at: null,
        },
      });
      await Promise.resolve();
    });
    expect(mockIo).not.toHaveBeenCalled();

    // Unmount between session-start and the messages fetch.
    let resolveMsgs: (v: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('startSupportChat')) {
        return Promise.resolve({
          startSupportChat: {
            id: 's2',
            ticket_no: 'CH',
            status: 'OPEN',
            ai_active: true,
            agent_id: null,
            agent_last_read_at: null,
          },
        });
      }
      if (body.includes('supportChatMessages')) {
        return new Promise((resolve) => {
          resolveMsgs = resolve;
        });
      }
      return Promise.resolve({});
    });
    mockIo.mockReturnValue(fakeSocket());
    const b = renderHook(() => useSupportChat());
    await waitFor(() => expect(b.result.current.session?.id).toBe('s2'));
    b.unmount();
    await act(async () => {
      resolveMsgs({ supportChatMessages: [msg('late')] });
      await Promise.resolve();
    });
  });
});
