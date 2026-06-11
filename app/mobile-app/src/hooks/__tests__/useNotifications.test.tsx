import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileMarkAllNotificationsReadDocument,
  MobileMarkNotificationReadDocument,
  MobileNotificationsDocument,
} from '@/graphql/notification';
import { graphqlRequest } from '@/services/graphql.client';
import { useNotifications } from '@/hooks/useNotifications';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const feed = {
  myNotifications: [
    {
      id: 'n1',
      read_at: null,
      created_at: '2026-06-01',
      notification: { id: 'a', title: 'T', body: 'B' },
    },
  ],
  myUnreadNotificationCount: 1,
};

function routeRequest(doc: unknown) {
  if (doc === MobileNotificationsDocument) return Promise.resolve(feed);
  return Promise.resolve(true);
}

beforeEach(() => mockRequest.mockReset().mockImplementation(routeRequest));

describe('useNotifications', () => {
  it('loads notifications + unread count', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifs).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('swallows a load error and still settles', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifs).toEqual([]);
  });

  it('markRead skips already-read items and marks unread ones', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markRead({ id: 'n0', read_at: '2026-06-01' } as never);
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      MobileMarkNotificationReadDocument,
      expect.anything(),
      expect.anything(),
    );

    await act(async () => {
      await result.current.markRead({ id: 'n1', read_at: null } as never);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileMarkNotificationReadDocument,
      { id: 'n1' },
      { auth: true },
    );
  });

  it('markAll marks everything read', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.markAll();
    });
    expect(mockRequest).toHaveBeenCalledWith(MobileMarkAllNotificationsReadDocument, undefined, {
      auth: true,
    });
  });
});
