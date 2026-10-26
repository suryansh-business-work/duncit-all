import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import HeaderNotificationsBell from '../HeaderNotificationsBell';
import { fallbackT } from '../../../i18n/fallback';
import { MARK_READ } from '../queries';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  push: vi.fn(),
  sse: vi.fn(),
  screen: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
  useMutation: h.useMutation,
}));
vi.mock('../useHeaderPushNotifications', () => ({ useHeaderPushNotifications: h.push }));
vi.mock('../useNotificationsSse', () => ({ useNotificationsSse: h.sse }));
vi.mock('../notifications-screen', () => ({
  default: (p: Record<string, unknown>) => {
    h.screen(p);
    const props = p as {
      open: boolean;
      onClose: () => void;
      onNotifClick: (n: unknown) => Promise<void>;
      onMarkAll: () => Promise<void>;
      onRefresh: () => void;
      busyId: string | null;
      markAllBusy: boolean;
    };
    return props.open ? (
      <div data-testid="screen" data-busy={String(props.busyId)} data-markall={String(props.markAllBusy)}>
        <button data-testid="close" onClick={props.onClose} />
        <button data-testid="unread" onClick={() => props.onNotifClick({ id: 'n1', read_at: null, notification: { link_url: '/pods/1' } })} />
        <button data-testid="read" onClick={() => props.onNotifClick({ id: 'n2', read_at: 'x', notification: { link_url: '/pods/2' } })} />
        <button data-testid="nolink" onClick={() => props.onNotifClick({ id: 'n3', read_at: 'x', notification: null })} />
        <button data-testid="markall" onClick={() => props.onMarkAll()} />
        <button data-testid="refresh" onClick={props.onRefresh} />
      </div>
    ) : null;
  },
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

let refetch: ReturnType<typeof vi.fn>;
let markRead: ReturnType<typeof vi.fn>;
let markAll: ReturnType<typeof vi.fn>;
let setToast: ReturnType<typeof vi.fn>;
let toastState: { current: unknown };

const mount = (onToast = vi.fn()) => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HeaderNotificationsBell onToast={onToast} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
  return onToast;
};

beforeEach(() => {
  vi.clearAllMocks();
  refetch = vi.fn().mockResolvedValue(undefined);
  markRead = vi.fn().mockResolvedValue({});
  markAll = vi.fn().mockResolvedValue({});
  setToast = vi.fn();
  toastState = { current: null };
  h.useQuery.mockReturnValue({ data: { myNotifications: [{ id: 'n1' }], myUnreadNotificationCount: 2 }, refetch });
  h.useMutation.mockImplementation((doc: unknown) => (doc === MARK_READ ? [markRead] : [markAll]));
  h.push.mockImplementation(() => ({ perm: 'default', pushBusy: false, toast: toastState.current, setToast, enablePush: vi.fn() }));
});

describe('HeaderNotificationsBell', () => {
  it('names the bell with the unread count, or plainly when there is none', () => {
    mount();
    expect(screen.getByTestId('notifications-bell')).toHaveAccessibleName(
      fallbackT('mweb.a11y.notificationsUnread', { vars: { count: 2 } })
    );
  });

  it('uses the plain name and an empty list when the query has no data', () => {
    h.useQuery.mockReturnValue({ data: undefined, refetch });
    mount();
    expect(screen.getByTestId('notifications-bell')).toHaveAccessibleName(fallbackT('mweb.appHeader.notifications'));
    fireEvent.click(screen.getByTestId('notifications-bell'));
    expect((h.screen.mock.calls.at(-1)?.[0] as { notifs: unknown[] }).notifs).toEqual([]);
  });

  it('opens and closes the inbox', () => {
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    expect(screen.getByTestId('screen')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close'));
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
  });

  it('refetches when the live channel announces a notification and swallows a failing refetch', async () => {
    mount();
    const onEvent = h.sse.mock.calls[0][0] as () => void;
    onEvent();
    expect(refetch).toHaveBeenCalledTimes(1);
    refetch.mockRejectedValueOnce(new Error('offline'));
    onEvent();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
  });

  it('bubbles a push toast up once and clears it', () => {
    toastState.current = { title: 'Hi', body: 'There' };
    const onToast = mount();
    expect(onToast).toHaveBeenCalledWith({ title: 'Hi', body: 'There' });
    expect(setToast).toHaveBeenCalledWith(null);
  });

  it('marks an unread notification read, refetches, closes and follows its link', async () => {
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('unread'));
    });
    expect(markRead).toHaveBeenCalledWith({ variables: { id: 'n1' } });
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/pods/1');
  });

  it('shows the row as busy while marking and clears it afterwards, even when marking fails', async () => {
    let finish: () => void = () => undefined;
    markRead.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    fireEvent.click(screen.getByTestId('unread'));
    expect(screen.getByTestId('screen')).toHaveAttribute('data-busy', 'n1');
    await act(async () => finish());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/pods/1'));
  });

  it('still follows the link when marking read fails', async () => {
    markRead.mockRejectedValueOnce(new Error('nope'));
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('unread'));
    });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/pods/1'));
  });

  it('does not mark an already-read notification, and goes to its link', async () => {
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('read'));
    });
    expect(markRead).not.toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/pods/2');
  });

  it('closes without navigating when the notification has no link', async () => {
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('nolink'));
    });
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('marks everything read and refetches, flagging mark-all busy meanwhile', async () => {
    let finish: () => void = () => undefined;
    markAll.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    fireEvent.click(screen.getByTestId('markall'));
    expect(screen.getByTestId('screen')).toHaveAttribute('data-markall', 'true');
    await act(async () => finish());
    await waitFor(() => expect(screen.getByTestId('screen')).toHaveAttribute('data-markall', 'false'));
    expect(refetch).toHaveBeenCalled();
  });

  it('recovers from a failing mark-all', async () => {
    markAll.mockRejectedValueOnce(new Error('nope'));
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('markall'));
    });
    expect(screen.getByTestId('screen')).toHaveAttribute('data-markall', 'false');
  });

  it('re-reads the inbox on refresh, ignoring a failure', async () => {
    mount();
    fireEvent.click(screen.getByTestId('notifications-bell'));
    refetch.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByTestId('refresh'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });
});
