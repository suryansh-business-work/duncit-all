import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTicketDetails, useUnifiedTickets } from '@/hooks/useUnifiedTickets';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const row = {
  id: 't1',
  ticket_no: 'ST-ABC123',
  title: 'Refund issue',
  status: 'OPEN',
  source: 'TICKET',
  created_at: new Date().toISOString(),
};

const ticket = {
  id: 't1',
  subject: 'Refund issue',
  category: 'PAYMENT',
  status: 'OPEN',
  created_at: new Date().toISOString(),
  messages: [
    {
      id: 'm1',
      author_role: 'USER',
      author_name: 'Me',
      body_text: 'Please refund',
      attachments: [],
      created_at: new Date().toISOString(),
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

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

describe('useTicketDetails', () => {
  it('loads the ticket and replies (reloading after)', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('replyToTicket')) {
        return Promise.resolve({ replyToTicket: { id: 't1', message_count: 2 } });
      }
      return Promise.resolve({ ticket });
    });
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ticket?.subject).toBe('Refund issue');

    await act(async () => {
      await result.current.reply('On it');
    });
    // reply → reload (initial load + reply + reload = 3 calls)
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('re-opens the ticket and reloads the thread', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const body = JSON.stringify(doc);
      if (body.includes('reopenTicket'))
        return Promise.resolve({ reopenTicket: { id: 't1', status: 'OPEN' } });
      return Promise.resolve({ ticket });
    });
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reopen('Still broken');
    });
    expect(mockRequest.mock.calls.some((c) => JSON.stringify(c[0]).includes('reopenTicket'))).toBe(
      true,
    );
    // The reason is forwarded to the reopen mutation.
    const reopenCall = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('reopenTicket'),
    );
    expect(reopenCall?.[1]).toEqual({ ticketId: 't1', reason: 'Still broken' });
  });

  it('sends a null reason when the reopen reason is blank', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      if (JSON.stringify(doc).includes('reopenTicket'))
        return Promise.resolve({ reopenTicket: { id: 't1', status: 'OPEN' } });
      return Promise.resolve({ ticket });
    });
    const { result } = renderHook(() => useTicketDetails('t1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.reopen('   ');
    });
    const reopenCall = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('reopenTicket'),
    );
    expect(reopenCall?.[1]).toEqual({ ticketId: 't1', reason: null });
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
});
