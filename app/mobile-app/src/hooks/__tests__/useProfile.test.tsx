import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useProfile } from '@/hooks/useProfile';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useProfile', () => {
  it('loads me + posts', async () => {
    mockRequest.mockResolvedValueOnce({ me: { user_id: 'u', roles: [] }, myPosts: [{ id: 'p1' }] });
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me?.user_id).toBe('u');
    expect(result.current.posts).toHaveLength(1);
  });

  it('captures errors', async () => {
    mockRequest.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});
