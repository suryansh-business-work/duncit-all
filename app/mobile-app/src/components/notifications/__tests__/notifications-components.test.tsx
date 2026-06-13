import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { NotificationsScreen } from '@/components/notifications/NotificationsScreen';
import { useNotifications, type UserNotification } from '@/hooks/useNotifications';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useNotifications', () => ({ useNotifications: jest.fn() }));
const mockedUseNotifications = useNotifications as jest.Mock;

const notif = (over: Record<string, unknown> = {}): UserNotification =>
  ({
    id: 'n1',
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    notification: {
      id: 'a',
      title: 'Pod soon',
      body: 'Starts in an hour',
      image_url: null,
      link_url: null,
      created_at: '2026-06-01',
    },
    ...over,
  }) as unknown as UserNotification;

describe('NotificationRow', () => {
  it('renders unread row with title/body and fires onPress', () => {
    const onPress = jest.fn();
    renderWithProviders(<NotificationRow item={notif()} onPress={onPress} />);
    expect(screen.getByText('Pod soon')).toBeOnTheScreen();
    expect(screen.getByText('Starts in an hour')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('notification-n1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders an image + link arrow for a read item with link', () => {
    renderWithProviders(
      <NotificationRow
        item={notif({
          read_at: '2026-06-01',
          notification: {
            id: 'a',
            title: 'T',
            body: 'B',
            image_url: 'http://i',
            link_url: 'http://x',
          },
        })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('T')).toBeOnTheScreen();
  });
});

describe('NotificationsScreen', () => {
  const base = {
    open: true,
    onClose: jest.fn(),
    onNotifClick: jest.fn(),
    onMarkAll: jest.fn(),
  };

  it('confirms before disabling notifications, and cancels without changing (B2-#8)', () => {
    const { useNotificationPrefsStore } = jest.requireActual<
      typeof import('@/stores/notification-prefs.store')
    >('@/stores/notification-prefs.store');
    useNotificationPrefsStore.setState({ enabled: true });
    renderWithProviders(<NotificationsScreen {...base} notifs={[]} unreadCount={0} />);
    const toggle = screen.getByTestId('notifications-allow-switch');

    // Flipping off opens a confirmation; cancelling keeps it enabled.
    fireEvent(toggle, 'valueChange', false);
    expect(screen.getByText('Disable notifications?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('notif-toggle-confirm-cancel'));
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);

    // Flipping off then confirming disables it.
    fireEvent(toggle, 'valueChange', false);
    fireEvent.press(screen.getByTestId('notif-toggle-confirm-confirm'));
    expect(useNotificationPrefsStore.getState().enabled).toBe(false);

    // Flipping on then confirming re-enables it.
    fireEvent(toggle, 'valueChange', true);
    expect(screen.getByText('Enable notifications?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('notif-toggle-confirm-confirm'));
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
  });

  it('shows the empty state and "All caught up"', () => {
    renderWithProviders(<NotificationsScreen {...base} notifs={[]} unreadCount={0} />);
    expect(screen.getByText('All caught up')).toBeOnTheScreen();
    expect(screen.getByText('No notifications yet.')).toBeOnTheScreen();
  });

  it('lists notifications, marks all and closes', () => {
    const onMarkAll = jest.fn();
    const onClose = jest.fn();
    const onNotifClick = jest.fn();
    renderWithProviders(
      <NotificationsScreen
        open
        onClose={onClose}
        onMarkAll={onMarkAll}
        onNotifClick={onNotifClick}
        notifs={[notif({ id: 'n1' }), notif({ id: 'n2' })]}
        unreadCount={2}
      />,
    );
    expect(screen.getByText('2 unread updates')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('notifications-mark-all'));
    fireEvent.press(screen.getByTestId('notification-n1'));
    fireEvent.press(screen.getByTestId('notifications-close'));
    expect(onMarkAll).toHaveBeenCalled();
    expect(onNotifClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('derives the unread count from the visible items, ignoring read ones (BUG-5)', () => {
    renderWithProviders(
      <NotificationsScreen
        {...base}
        notifs={[notif({ id: 'n1', read_at: '2026-06-01' }), notif({ id: 'n2' })]}
        unreadCount={9}
      />,
    );
    // Only n2 is unread, so a stale server count of 9 is overridden to 1.
    expect(screen.getByText('1 unread update')).toBeOnTheScreen();
  });

  it('falls back to the server unread count when no items are loaded (BUG-5)', () => {
    renderWithProviders(<NotificationsScreen {...base} notifs={[]} unreadCount={5} />);
    expect(screen.getByText('5 unread updates')).toBeOnTheScreen();
  });
});

describe('NotificationsBell', () => {
  const refetch = jest.fn();
  const markRead = jest.fn();
  const markAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    markRead.mockResolvedValue(undefined);
    mockedUseNotifications.mockReturnValue({
      notifs: [notif()],
      unreadCount: 3,
      refetch,
      markRead,
      markAll,
    });
  });

  it('shows the unread badge and opens the screen (refetching)', () => {
    renderWithProviders(<NotificationsBell />);
    expect(screen.getByText('3')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('notifications-bell'));
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByTestId('notifications-screen')).toBeOnTheScreen();
  });

  it('caps the badge at 9+', () => {
    mockedUseNotifications.mockReturnValue({
      notifs: [],
      unreadCount: 12,
      refetch,
      markRead,
      markAll,
    });
    renderWithProviders(<NotificationsBell />);
    expect(screen.getByText('9+')).toBeOnTheScreen();
  });

  it('hides the badge when there are no unread', () => {
    mockedUseNotifications.mockReturnValue({
      notifs: [],
      unreadCount: 0,
      refetch,
      markRead,
      markAll,
    });
    renderWithProviders(<NotificationsBell />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('marks a tapped notification read and opens its http link', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    mockedUseNotifications.mockReturnValue({
      notifs: [
        notif({
          notification: { id: 'a', title: 'T', body: 'B', image_url: null, link_url: 'http://x' },
        }),
      ],
      unreadCount: 1,
      refetch,
      markRead,
      markAll,
    });
    renderWithProviders(<NotificationsBell />);
    fireEvent.press(screen.getByTestId('notifications-bell'));
    fireEvent.press(screen.getByTestId('notification-n1'));
    await waitFor(() => expect(markRead).toHaveBeenCalled());
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('http://x'));
  });

  it('marks read without navigating when there is no link', async () => {
    renderWithProviders(<NotificationsBell />);
    fireEvent.press(screen.getByTestId('notifications-bell'));
    fireEvent.press(screen.getByTestId('notification-n1'));
    await waitFor(() => expect(markRead).toHaveBeenCalled());
  });
});
