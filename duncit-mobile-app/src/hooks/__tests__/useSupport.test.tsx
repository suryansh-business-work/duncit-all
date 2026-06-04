import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { createTicket, useTickets } from '@/hooks/useSupport';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

const ticket = {
  id: 't1',
  subject: 'Help',
  category: 'GENERAL',
  status: 'OPEN',
  priority: 'LOW',
  message_count: 1,
  last_message_at: '',
  created_at: '',
};

describe('useTickets', () => {
  it('loads tickets, and captures errors', async () => {
    mockRequest.mockResolvedValueOnce({ myTickets: [ticket] });
    const ok = renderHook(() => useTickets());
    await waitFor(() => expect(ok.result.current.isLoading).toBe(false));
    expect(ok.result.current.tickets).toHaveLength(1);

    mockRequest.mockRejectedValueOnce(new Error('x'));
    const bad = renderHook(() => useTickets());
    await waitFor(() => expect(bad.result.current.isLoading).toBe(false));
    expect(bad.result.current.error).toBeDefined();
  });
});

describe('createTicket', () => {
  it('calls the mutation with the input', async () => {
    mockRequest.mockResolvedValueOnce({ createTicket: { id: 't1' } });
    await createTicket('Subject', 'Body', 'PAYMENT');
    expect(mockRequest).toHaveBeenCalled();
    const [, vars] = mockRequest.mock.calls[0];
    expect(vars).toEqual({ input: { subject: 'Subject', body_text: 'Body', category: 'PAYMENT' } });
  });
});
