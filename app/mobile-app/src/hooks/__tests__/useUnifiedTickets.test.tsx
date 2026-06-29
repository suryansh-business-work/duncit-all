import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';

import { useTicketDetails, useUnifiedTickets } from '@/hooks/useUnifiedTickets';
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
    on: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
    emit: jest.fn(),
    disconnect: jest.fn(),
    fire: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
}

const row = {
  id: 't1',
  ticket_no: 'ST-ABC123',
  title: 'Refund issue',
  status: 'OPEN',
  source: 'TICKET',
  created_at: new Date().toISOString(),
};

const userMsg = (id: string) => ({
  id,
  author_role: 'USER',
  author_name: 'Me',
  body_text: `msg-${id}`,
  attachments: [],
  created_at: new Date().toISOString(),
});
const agentMsg = (id: string) => ({ ...userMsg(id), author_role: 'AGENT', author_name: 'Support' });

const ticket = {
  id: 't1',
  subject: 'Refund issue',
  category: 'PAYMENT',
  status: 'OPEN',
  created_at: new Date().toISOString(),
  agent_last_read_at: null,
  user_last_read_at: null,
  messages: [userMsg('m1')],
};

const markReadCalls = () =>
  mockRequest.mock.calls.filter((c) => JSON.stringify(c[0]).includes('markTicketRead')).length;
const ticketLoads = () =>
  mockRequest.mock.calls.filter((c) => JSON.stringify(c[0]).includes('MobileTicketDetails')).length;

beforeEach(() => {
  jest.clearAllMocks();
  mockToken.mockResolvedValue(null); // socket off by default — keeps the action tests simple
});

describe('useUnifiedTickets', () => {
  it('loads the unified rows', async () => {
    mockRequest.mockResolvedValue({ myUnifiedSupportTickets: [row] });
    const { result } = renderHook(() => useUnifiedTickets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toEqual([row]);
    expect(result.current.error).toBe('');
  });

  it('surfaces a load failure', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useUnifiedTickets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('offline');
  });

  it('falls back to a generic message for non-Error failures', async () => {
    mockRequest.mockRejectedValue('weird');
    const { result } = renderHook(() => useUnifiedTickets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Could not load.');
  });
});

const ticketFlow = (over: Record<string, unknown> = {}) => {
  mockRequest.mockImplementation((doc: unknown) => {
    const body = JSON.stringify(doc);
    if (body.includes('replyToTicket'))
      return Promise.resolve({ replyToTicket: { id: 't1', message_count: 2 } });
    if (body.includes('reopenTicket'))
      return Promise.resolve({ reopenTicket: { id: 't1', status: 'OPEN' } });
    if (body.includes('resolveTicket'))
      return Promise.resolve({ resolveTicket: { id: 't1', status: 'RESOLVED' } });
    if (body.includes('submitTicketFeedback'))
      return Promise.resolve({ submitTicketFeedback: { id: 't1', rating: 4 } });
    if (body.includes('ticketTranscript'))
      return Promise.resolve({
        ticketTranscript: { filename: 'support-ST.txt', text: 't', content_base64: 'dA==' },
      });
    if (body.includes('emailTicketTranscript'))
      return Promise.resolve({ emailTicketTranscript: true });
    if (body.includes('markTicketRead')) return Promise.resolve({ markTicketRead: { id: 't1' } });
    return Promise.resolve({ ticket: { ...ticket, ...over } });
  });
};

describe('useTicketDetails', () => {
  it('loads the ticket, marks it read on open, and replies (reloading after)', async () => {
    ticketFlow();
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ticket?.subject).toBe('Refund issue');
    expect(markReadCalls()).toBe(1); // marked read on open (B12)

    await act(async () => {
      await result.current.reply('On it');
    });
    expect(mockRequest.mock.calls.some((c) => JSON.stringify(c[0]).includes('replyToTicket'))).toBe(
      true,
    );
    expect(ticketLoads()).toBe(2); // initial load + reload after reply
  });

  it('re-opens the ticket and forwards the reason / null', async () => {
    ticketFlow();
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reopen('Still broken');
    });
    const reopenCall = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('reopenTicket'),
    );
    expect(reopenCall?.[1]).toEqual({ ticketId: 't1', reason: 'Still broken' });

    await act(async () => {
      await result.current.reopen('   ');
    });
    const blank = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('reopenTicket'))
      .at(-1);
    expect(blank?.[1]).toEqual({ ticketId: 't1', reason: null });
  });

  it('resolves the ticket and reloads (B7)', async () => {
    ticketFlow();
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.resolve();
    });
    expect(mockRequest.mock.calls.some((c) => JSON.stringify(c[0]).includes('resolveTicket'))).toBe(
      true,
    );
  });

  it('submits ticket feedback (trimmed) and reloads (B8)', async () => {
    ticketFlow();
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.submitFeedback(4, '   ');
    });
    const fb = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('submitTicketFeedback'),
    );
    expect(fb?.[1]).toEqual({ ticketId: 't1', rating: 4, comment: null });
  });

  it('fetches the transcript (.txt then .docx) and emails it (.docx) (B15)', async () => {
    ticketFlow();
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const txt = await result.current.getTranscript();
    expect(txt.filename).toBe('support-ST.txt');
    const txtVars = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('ticketTranscript'))
      .at(-1)?.[1] as Record<string, unknown>;
    expect(txtVars.format).toBe('TXT');

    await result.current.getTranscript('DOCX' as never);
    const docxVars = mockRequest.mock.calls
      .filter((c) => JSON.stringify(c[0]).includes('ticketTranscript'))
      .at(-1)?.[1] as Record<string, unknown>;
    expect(docxVars.format).toBe('DOCX');

    await act(async () => {
      await result.current.emailTranscript('me@x.com');
    });
    const em = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('emailTicketTranscript'),
    );
    expect(em?.[1]).toEqual({ ticketId: 't1', email: 'me@x.com', format: 'DOCX' });
  });

  it('treats a missing ticket as null', async () => {
    mockRequest.mockResolvedValue({ ticket: null });
    const { result } = renderHook(() => useTicketDetails('missing'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ticket).toBeNull();
  });

  it('keeps loading=false even when the initial load fails', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ticket).toBeNull();
  });

  it('swallows a failed mark-read without breaking the screen', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      if (JSON.stringify(doc).includes('markTicketRead'))
        return Promise.reject(new Error('read failed'));
      return Promise.resolve({ ticket });
    });
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ticket?.subject).toBe('Refund issue');
  });
});

describe('useTicketDetails live updates (B12)', () => {
  it('applies a live ticket:update, marks a new reply read, and ignores other tickets', async () => {
    ticketFlow();
    const socket = fakeSocket();
    mockIo.mockReturnValue(socket);
    mockToken.mockResolvedValue('tok');

    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    const before = markReadCalls();

    // A new agent reply arrives over the socket → thread grows + marks read.
    await act(async () => {
      socket.fire('ticket:update', { ...ticket, messages: [userMsg('m1'), agentMsg('m2')] });
    });
    expect(result.current.ticket?.messages).toHaveLength(2);
    expect(markReadCalls()).toBe(before + 1);

    // A pure read-state update (same count) must NOT re-mark (no loop).
    await act(async () => {
      socket.fire('ticket:update', {
        ...ticket,
        messages: [userMsg('m1'), agentMsg('m2')],
        agent_last_read_at: new Date().toISOString(),
      });
    });
    expect(markReadCalls()).toBe(before + 1);

    // An update for a different ticket is ignored.
    await act(async () => {
      socket.fire('ticket:update', { ...ticket, id: 'other', messages: [] });
    });
    expect(result.current.ticket?.id).toBe('t1');
  });

  it('skips the socket for an empty ticket id and disconnects on unmount', async () => {
    ticketFlow();
    const socket = fakeSocket();
    mockIo.mockReturnValue(socket);
    mockToken.mockResolvedValue('tok');

    const empty = renderHook(() => useTicketDetails(''));
    await waitFor(() => expect(empty.result.current.isLoading).toBe(false));
    expect(mockIo).not.toHaveBeenCalled();

    const { unmount } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('does not open a socket when the auth token resolves after unmount', async () => {
    ticketFlow();
    let resolveToken: (t: string) => void = () => undefined;
    mockToken.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveToken = resolve;
      }),
    );
    const { unmount } = renderHook(() => useTicketDetails('t1'));
    unmount();
    await act(async () => {
      resolveToken('late');
    });
    expect(mockIo).not.toHaveBeenCalled();
  });
});
