import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useMyHostRequest } from '@/hooks/useMyHostRequest';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const req = graphqlRequest as jest.Mock;

const HR = {
  id: 'hr1',
  request_no: 'HOSTREQ-000001',
  status: 'REQUESTED',
  super_category_name: 'For You',
  category_name: 'Sports',
  sub_category_name: 'Badminton',
  created_at: '2026-06-26T10:00:00.000Z',
};

beforeEach(() => req.mockReset());

describe('useMyHostRequest', () => {
  it('loads the active request', async () => {
    req.mockResolvedValue({ myHostRequest: HR });
    const { result } = renderHook(() => useMyHostRequest());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.request?.request_no).toBe('HOSTREQ-000001');
  });

  it('falls back to null when there is no active request', async () => {
    req.mockResolvedValue({ myHostRequest: null });
    const { result } = renderHook(() => useMyHostRequest());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.request).toBeNull();
  });

  it('falls back to null on error', async () => {
    req.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useMyHostRequest());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.request).toBeNull();
  });

  it('refetches on demand', async () => {
    req.mockResolvedValue({ myHostRequest: null });
    const { result } = renderHook(() => useMyHostRequest());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    req.mockResolvedValue({ myHostRequest: HR });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.request?.status).toBe('REQUESTED');
  });
});
