import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileCancelFollowRequestDocument,
  MobileFollowUserDocument,
  MobilePublicHostsDocument,
  MobilePublicVenuesDocument,
  MobileUnfollowUserDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { useHostsVenues, useVenueDetails } from '@/hooks/useHostsVenues';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const hostsData = {
  me: { user_id: 'me', following_user_ids: ['h2'] },
  publicHosts: [
    { id: 'a', user_id: 'h1', full_name: 'Host One', tags: [] },
    { id: 'b', user_id: 'h2', full_name: 'Host Two', tags: [] },
  ],
};
const venuesData = {
  publicVenues: [
    { id: 'v1', venue_name: 'Cafe' },
    { id: 'v2', venue_name: 'Hall' },
  ],
};

function route(doc: unknown) {
  if (doc === MobilePublicHostsDocument) return Promise.resolve(hostsData);
  if (doc === MobilePublicVenuesDocument) return Promise.resolve(venuesData);
  // Each follow mutation answers under its own field with the viewer's lists.
  const lists = { user_id: 'me', following_user_ids: [], requested_user_ids: [] };
  if (doc === MobileUnfollowUserDocument) return Promise.resolve({ unfollowUser: lists });
  return Promise.resolve({ followUser: lists });
}

beforeEach(() => mockRequest.mockReset().mockImplementation(route));

describe('useHostsVenues', () => {
  it('loads hosts, venues and following ids', async () => {
    const { result } = renderHook(() => useHostsVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hosts).toHaveLength(2);
    expect(result.current.venues).toHaveLength(2);
    expect(result.current.meId).toBe('me');
    expect(result.current.followingIds.has('h2')).toBe(true);
  });

  it('captures an error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useHostsVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('follows a non-followed host and unfollows a followed one; ignores self', async () => {
    const { result } = renderHook(() => useHostsVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleFollow('h1');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileFollowUserDocument,
      { user_id: 'h1' },
      { auth: true },
    );

    await act(async () => {
      await result.current.toggleFollow('h2');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUnfollowUserDocument,
      { user_id: 'h2' },
      { auth: true },
    );
    // Every settled toggle reloads the hosts list so the buttons read the server state.
    const hostReloads = mockRequest.mock.calls.filter(([doc]) => doc === MobilePublicHostsDocument);
    expect(hostReloads).toHaveLength(3);
    expect(result.current.pendingFollow).toBeNull();

    mockRequest.mockClear();
    await act(async () => {
      await result.current.toggleFollow('me');
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('reads a pending request as Requested and withdraws it on tap', async () => {
    const requested = { ...hostsData, me: { ...hostsData.me, requested_user_ids: ['h1'] } };
    mockRequest.mockImplementation((doc: unknown) => {
      if (doc === MobilePublicHostsDocument) return Promise.resolve(requested);
      if (doc === MobileCancelFollowRequestDocument) {
        return Promise.resolve({ cancelFollowRequest: { following_user_ids: ['h2'] } });
      }
      return route(doc);
    });
    const { result } = renderHook(() => useHostsVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.statusFor('h1')).toBe('REQUESTED');
    expect(result.current.statusFor('h2')).toBe('FOLLOWING');
    expect(result.current.statusFor('zz')).toBe('NONE');

    await act(async () => {
      await result.current.toggleFollow('h1');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCancelFollowRequestDocument,
      { user_id: 'h1' },
      { auth: true },
    );
  });
});

describe('useVenueDetails', () => {
  it('finds a venue by id', async () => {
    const { result } = renderHook(() => useVenueDetails('v2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.venue?.venue_name).toBe('Hall');
  });

  it('returns null for an unknown id', async () => {
    const { result } = renderHook(() => useVenueDetails('nope'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.venue).toBeNull();
  });

  it('captures an error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useVenueDetails('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});
