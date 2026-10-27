import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import NotificationsScreen from '../NotificationsScreen';

const h = vi.hoisted(() => ({ supported: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('../../../../pwa', () => ({ isPushSupported: h.supported, unsubscribePush: h.unsubscribe }));
vi.mock('../NotificationsHero', () => ({
  default: (p: { pushSupported: boolean; pushOn: boolean; pushBusy: boolean; onToggle: (next: boolean) => void }) => (
    <div data-testid="hero" data-supported={String(p.pushSupported)} data-on={String(p.pushOn)} data-busy={String(p.pushBusy)}>
      <button data-testid="hero-enable" onClick={() => p.onToggle(true)} />
      <button data-testid="hero-disable" onClick={() => p.onToggle(false)} />
    </div>
  ),
}));
vi.mock('../NotificationFilterChips', () => ({
  default: (p: { chips: { key: string }[]; value: string; onChange: (key: string) => void }) => (
    <div data-testid="chips" data-keys={p.chips.map((c) => c.key).join(',')} data-value={p.value}>
      <button data-testid="chip-payment" onClick={() => p.onChange('payment')} />
    </div>
  ),
}));
vi.mock('../NotificationsList', () => ({
  default: (p: { visible: { id: string }[]; busyId: string | null; markAllBusy: boolean; onNotifClick: (n: unknown) => void; onRefresh?: () => void }) => (
    <div data-testid="list" data-ids={p.visible.map((n) => n.id).join(',')} data-busy={String(p.busyId)} data-markall={String(p.markAllBusy)}>
      <button data-testid="list-click" onClick={() => p.onNotifClick(p.visible[0])} />
      <button data-testid="list-refresh" onClick={p.onRefresh} />
    </div>
  ),
}));

const note = (id: string, title: string, read_at: string | null = null) => ({ id, read_at, notification: { title } });

const screenWith = (over: Partial<Parameters<typeof NotificationsScreen>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    notifs: [note('1', 'Payment received'), note('2', 'Pod reminder', 'x')],
    unreadCount: 1,
    perm: 'default' as const,
    pushBusy: false,
    onEnablePush: vi.fn(),
    onNotifClick: vi.fn(),
    onMarkAll: vi.fn(),
    ...over,
  };
  render(<NotificationsScreen {...props} />);
  return props;
};

beforeEach(() => {
  vi.clearAllMocks();
  h.supported.mockReturnValue(true);
  h.unsubscribe.mockResolvedValue(undefined);
});

describe('NotificationsScreen', () => {
  it('shows the unread count derived from the rows, singular and plural', () => {
    screenWith();
    expect(screen.getByTestId('notifications-subtitle')).toHaveTextContent('1 unread update');
    expect(screen.getByTestId('notifications-subtitle')).not.toHaveTextContent('updates');
  });

  it('pluralises the unread count', () => {
    screenWith({ notifs: [note('1', 'Payment a'), note('2', 'Payment b')], unreadCount: 0 });
    expect(screen.getByTestId('notifications-subtitle')).toHaveTextContent('2 unread updates');
  });

  it('says all caught up with nothing unread and disables mark-all', () => {
    screenWith({ notifs: [note('1', 'Payment a', 'x')], unreadCount: 0 });
    expect(screen.getByTestId('notifications-subtitle')).toHaveTextContent('All caught up');
    expect(screen.getByTestId('notifications-mark-all')).toBeDisabled();
  });

  it('falls back to the server count when every rendered row is read but the server says unread', () => {
    screenWith({ notifs: [note('1', 'Payment a', 'x')], unreadCount: 3 });
    expect(screen.getByTestId('notifications-subtitle')).toHaveTextContent('3 unread updates');
  });

  it('closes, and marks everything read', () => {
    const props = screenWith();
    fireEvent.click(screen.getByTestId('notifications-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('notifications-mark-all'));
    expect(props.onMarkAll).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner and disables mark-all while it runs, and flags the list busy', () => {
    screenWith({ markAllBusy: true, busyId: '1' });
    expect(screen.getByTestId('notifications-mark-all-busy')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-mark-all')).toBeDisabled();
    expect(screen.getByTestId('list')).toHaveAttribute('data-markall', 'true');
    expect(screen.getByTestId('list')).toHaveAttribute('data-busy', '1');
  });

  it('lists every notification under All and forwards a click and a refresh', () => {
    const props = screenWith({ onRefresh: vi.fn() });
    expect(screen.getByTestId('list')).toHaveAttribute('data-ids', '1,2');
    fireEvent.click(screen.getByTestId('list-click'));
    expect(props.onNotifClick).toHaveBeenCalledWith(props.notifs[0]);
    fireEvent.click(screen.getByTestId('list-refresh'));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('offers a chip per category present and narrows the list to the picked one', () => {
    screenWith();
    expect(screen.getByTestId('chips')).toHaveAttribute('data-keys', 'all,payment,pod');
    fireEvent.click(screen.getByTestId('chip-payment'));
    expect(screen.getByTestId('chips')).toHaveAttribute('data-value', 'payment');
    expect(screen.getByTestId('list')).toHaveAttribute('data-ids', '1');
  });

  it('falls back to All when the picked category has no rows left', () => {
    const base = {
      open: true,
      onClose: vi.fn(),
      unreadCount: 0,
      perm: 'default' as const,
      pushBusy: false,
      onEnablePush: vi.fn(),
      onNotifClick: vi.fn(),
      onMarkAll: vi.fn(),
    };
    const { rerender } = render(<NotificationsScreen {...base} notifs={[note('1', 'Payment received'), note('2', 'Pod reminder')]} />);
    fireEvent.click(screen.getByTestId('chip-payment'));
    expect(screen.getByTestId('list')).toHaveAttribute('data-ids', '1');
    rerender(<NotificationsScreen {...base} notifs={[note('2', 'Pod reminder')]} />);
    expect(screen.getByTestId('chips')).toHaveAttribute('data-value', 'all');
    expect(screen.getByTestId('list')).toHaveAttribute('data-ids', '2');
  });

  it('says there are no notifications yet for an empty inbox', () => {
    screenWith({ notifs: [], unreadCount: 0 });
    expect(screen.getByTestId('notifications-empty')).toHaveTextContent('No notifications yet.');
    expect(screen.queryByTestId('list')).not.toBeInTheDocument();
  });

  it('reports push as unsupported when the browser or the permission says so', () => {
    h.supported.mockReturnValue(false);
    screenWith();
    expect(screen.getByTestId('hero')).toHaveAttribute('data-supported', 'false');
  });

  it('reports push as unsupported for an unsupported permission state, and on when granted', () => {
    screenWith({ perm: 'unsupported' });
    expect(screen.getByTestId('hero')).toHaveAttribute('data-supported', 'false');
  });

  it('shows push as on when permission is granted', () => {
    screenWith({ perm: 'granted' });
    expect(screen.getByTestId('hero')).toHaveAttribute('data-on', 'true');
    expect(screen.getByTestId('hero')).toHaveAttribute('data-supported', 'true');
  });

  it('confirms before enabling push, then enables it', async () => {
    const props = screenWith();
    fireEvent.click(screen.getByTestId('hero-enable'));
    expect(await screen.findByText('Enable notifications?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(props.onEnablePush).toHaveBeenCalledTimes(1);
    expect(h.unsubscribe).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Enable notifications?')).not.toBeInTheDocument());
  });

  it('confirms before disabling push, then unsubscribes without enabling', async () => {
    const props = screenWith({ perm: 'granted' });
    fireEvent.click(screen.getByTestId('hero-disable'));
    expect(await screen.findByText('Disable notifications?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(h.unsubscribe).toHaveBeenCalledTimes(1);
    expect(props.onEnablePush).not.toHaveBeenCalled();
  });

  it('swallows a failing unsubscribe', async () => {
    h.unsubscribe.mockRejectedValueOnce(new Error('sw gone'));
    screenWith({ perm: 'granted' });
    fireEvent.click(screen.getByTestId('hero-disable'));
    fireEvent.click(await screen.findByRole('button', { name: 'Disable' }));
    await waitFor(() => expect(h.unsubscribe).toHaveBeenCalled());
  });

  it('cancels the confirmation without touching push', async () => {
    const props = screenWith();
    fireEvent.click(screen.getByTestId('hero-enable'));
    fireEvent.click(await screen.findByRole('button', { name: /cancel/i }));
    expect(props.onEnablePush).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Enable notifications?')).not.toBeInTheDocument());
  });
});
