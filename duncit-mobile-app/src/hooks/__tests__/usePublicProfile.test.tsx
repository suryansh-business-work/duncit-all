import { renderHook, waitFor } from '@testing-library/react-native';

import { MobilePublicProfileDocument, MobileUserBadgesDocument } from '@/graphql/public-profile';
import { graphqlRequest } from '@/services/graphql.client';
import { usePublicProfile } from '@/hooks/usePublicProfile';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const badge = {
  id: 'ub1',
  awarded_at: '2026-06-01',
  awarded_reason: 'r',
  badge: { id: 'b', title: 'Star' },
};

function route(doc: unknown, vars: { user_id: string }, me = 'me') {
  if (doc === MobilePublicProfileDocument) {
    return Promise.resolve({
      publicUserProfile: {
        user_id: vars.user_id,
        full_name: 'Riya',
        city: 'Pune',
        zone: 'Kothrud',
      },
      me: { user_id: me },
    });
  }
  if (doc === MobileUserBadgesDocument) return Promise.resolve({ userBadges: [badge] });
  return Promise.resolve({});
}

beforeEach(() =>
  mockRequest
    .mockReset()
    .mockImplementation((doc, vars) => route(doc, vars as { user_id: string })),
);

describe('usePublicProfile', () => {
  it('loads the profile, badges and detects a non-owner', async () => {
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.full_name).toBe('Riya');
    expect(result.current.badges).toHaveLength(1);
    expect(result.current.isOwner).toBe(false);
  });

  it('flags the viewer as owner when ids match', async () => {
    mockRequest.mockImplementation((doc, vars) => route(doc, vars as { user_id: string }, 'me'));
    const { result } = renderHook(() => usePublicProfile('me'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOwner).toBe(true);
  });

  it('is not owner when the viewer is logged out (no me)', async () => {
    mockRequest.mockReset().mockImplementation((doc) => {
      if (doc === MobilePublicProfileDocument) {
        return Promise.resolve({
          publicUserProfile: { user_id: 'h1', full_name: 'Riya' },
          me: null,
        });
      }
      return Promise.resolve({ userBadges: [] });
    });
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOwner).toBe(false);
  });

  it('captures an error from the profile query', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('tolerates a badges fetch failure (profile still loads)', async () => {
    mockRequest.mockReset().mockImplementation((doc, vars) => {
      if (doc === MobileUserBadgesDocument) return Promise.reject(new Error('no badges'));
      return route(doc, vars as { user_id: string });
    });
    const { result } = renderHook(() => usePublicProfile('h1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.full_name).toBe('Riya');
    expect(result.current.badges).toEqual([]);
  });
});
