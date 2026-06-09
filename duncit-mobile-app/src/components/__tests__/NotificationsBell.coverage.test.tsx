import { fireEvent, screen } from '@testing-library/react-native';

import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifs: [],
    unreadCount: 0,
    refetch: jest.fn(),
    markRead: jest.fn(),
    markAll: jest.fn(),
  }),
}));

describe('NotificationsBell open/close', () => {
  it('opens the notifications screen and closes it', () => {
    renderWithProviders(<NotificationsBell />);
    fireEvent.press(screen.getByTestId('notifications-bell'));
    expect(screen.getByTestId('notifications-screen')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('notifications-close'));
    expect(screen.queryByTestId('notifications-screen')).toBeNull();
  });
});
