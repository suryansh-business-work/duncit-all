import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileMarkAllNotificationsReadDocument,
  MobileMarkNotificationReadDocument,
  MobileNotificationsDocument,
} from '@/graphql/notification';
import { graphqlRequest } from '@/services/graphql.client';
import { displayLocalNotification } from '@/services/local-notifications';
import { useNotifications } from '@/hooks/useNotifications';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/local-notifications', () => ({ displayLocalNotification: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockDisplay = displayLocalNotification as jest.Mock;

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

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(routeRequest);
  mockDisplay.mockReset().mockResolvedValue(true);
});

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

describe('useNotifications → device notifications (Notifee)', () => {
  it('surfaces only newly arrived unread items, never the first load', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // First load only seeds the seen-set.
    expect(mockDisplay).not.toHaveBeenCalled();

    mockRequest.mockImplementation((doc: unknown) => {
      if (doc === MobileNotificationsDocument) {
        return Promise.resolve({
          myNotifications: [
            ...feed.myNotifications,
            {
              id: 'n2',
              read_at: null,
              created_at: '2026-06-02',
              notification: { id: 'b', title: 'Fresh', body: 'New body' },
            },
            {
              id: 'n3',
              read_at: '2026-06-02',
              created_at: '2026-06-02',
              notification: { id: 'c', title: 'Read', body: 'Old' },
            },
          ],
          myUnreadNotificationCount: 2,
        });
      }
      return Promise.resolve(true);
    });
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockDisplay).toHaveBeenCalledTimes(1);
    expect(mockDisplay).toHaveBeenCalledWith({ id: 'n2', title: 'Fresh', body: 'New body' });
  });

  it('stays silent when the allow-notifications switch is off', async () => {
    const { useNotificationPrefsStore } = jest.requireActual<
      typeof import('@/stores/notification-prefs.store')
    >('@/stores/notification-prefs.store');
    useNotificationPrefsStore.setState({ enabled: false });
    try {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      mockRequest.mockImplementation((doc: unknown) => {
        if (doc === MobileNotificationsDocument) {
          return Promise.resolve({
            myNotifications: [
              {
                id: 'n7',
                read_at: null,
                created_at: '2026-06-02',
                notification: { id: 'g', title: 'Muted', body: 'No banner' },
              },
            ],
            myUnreadNotificationCount: 1,
          });
        }
        return Promise.resolve(true);
      });
      await act(async () => {
        await result.current.refetch();
      });
      expect(mockDisplay).not.toHaveBeenCalled();
    } finally {
      useNotificationPrefsStore.setState({ enabled: true });
    }
  });

  it('swallows a display failure', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockDisplay.mockRejectedValue(new Error('no permission'));
    mockRequest.mockImplementation((doc: unknown) => {
      if (doc === MobileNotificationsDocument) {
        return Promise.resolve({
          myNotifications: [
            {
              id: 'n9',
              read_at: null,
              created_at: '2026-06-02',
              notification: { id: 'z', title: 'X', body: 'Y' },
            },
          ],
          myUnreadNotificationCount: 1,
        });
      }
      return Promise.resolve(true);
    });
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockDisplay).toHaveBeenCalled();
  });
});
