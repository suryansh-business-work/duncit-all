import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import NotificationsBell from '../NotificationsBell';

vi.mock('../notifications-screen', () => ({
  default: (p: { open: boolean; onClose: () => void; onNotifClick: (n: unknown) => void; unreadCount: number }) =>
    p.open ? (
      <div data-testid="screen" data-unread={p.unreadCount}>
        <button data-testid="close" onClick={p.onClose} />
        <button data-testid="pick" onClick={() => p.onNotifClick({ id: 'n1' })} />
      </div>
    ) : null,
}));

const bell = (unreadCount: number) => {
  const props = {
    notifs: [],
    unreadCount,
    perm: 'default' as const,
    pushBusy: false,
    onEnablePush: vi.fn(),
    onNotifClick: vi.fn(),
    onMarkAll: vi.fn(),
  };
  render(<NotificationsBell {...props} />);
  return props;
};

describe('NotificationsBell', () => {
  it('names the button with the unread count and shows the badge', () => {
    bell(3);
    expect(screen.getByTestId('notifications-bell')).toHaveAccessibleName(/Notifications/);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('has a plain name when everything is read', () => {
    bell(0);
    expect(screen.getByTestId('notifications-bell').getAttribute('aria-label')).toBe('Notifications');
  });

  it('opens the inbox, closes it, and closes it again when a notification is picked', () => {
    const props = bell(2);
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    expect(screen.getByTestId('screen')).toHaveAttribute('data-unread', '2');
    fireEvent.click(screen.getByTestId('close'));
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    fireEvent.click(screen.getByTestId('pick'));
    expect(props.onNotifClick).toHaveBeenCalledWith({ id: 'n1' });
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
  });
});
