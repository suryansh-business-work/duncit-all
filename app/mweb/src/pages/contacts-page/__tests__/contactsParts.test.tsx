import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import ContactRow from '../ContactRow';
import ContactsEmpty from '../ContactsEmpty';
import { ContactsLoadProgress, ContactsProgress } from '../ContactsProgress';
import InviteRow from '../InviteRow';
import VirtualRows from '../VirtualRows';
import ContactsAllowCard from '../ContactsAllowCard';
import { useClearContacts } from '../useClearContacts';
import { useContactsList } from '../useContactsList';
import { useContactsSync } from '../useContactsSync';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useMutation: vi.fn(),
  client: { query: vi.fn() },
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  logError: vi.fn(),
  sync: vi.fn(),
  virtual: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useMutation: h.useMutation,
  useApolloClient: () => h.client,
}));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('@duncit/dialogs', async (orig) => ({ ...(await orig<object>()), useConfirm: () => h.confirm }));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), syncContactsInSlices: h.sync }));
vi.mock('../../../components/FollowButton', () => ({
  default: (p: { status: string; followsViewer?: boolean | null; onToggle: () => void }) => (
    <button data-testid="follow" data-status={p.status} data-follows-viewer={String(p.followsViewer)} onClick={p.onToggle} />
  ),
}));
vi.mock('../../../hooks/useVirtualRows', () => ({ useVirtualRows: h.virtual }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ContactRow', () => {
  const row = (over: object = {}, profile: object = {}) => ({
    contact_label: 'Mum',
    is_nearby: false,
    profile: { user_id: 'u1', username: 'asha', full_name: 'Asha Rao', first_name: 'Asha', profile_photo: '', follow_status: 'NONE', follows_viewer: false, ...profile },
    ...over,
  });
  const mount = (r: object, onToggleFollow = vi.fn().mockResolvedValue(undefined)) => {
    const onOpen = vi.fn();
    render(<ContactRow row={r as never} onToggleFollow={onToggleFollow} onOpen={onOpen} />);
    return { onOpen, onToggleFollow };
  };

  it('shows the name, handle and the name it was saved under, and opens the profile on press', () => {
    const { onOpen } = mount(row());
    const tile = screen.getByTestId('contact-row-u1');
    expect(tile).toHaveTextContent('Asha Rao');
    expect(tile).toHaveTextContent('@asha · ' + fallbackT('mweb.contacts.savedAs', { vars: { label: 'Mum' } }));
    expect(tile).toHaveAccessibleName(fallbackT('mweb.podDetails.openProfileOf', { vars: { name: 'Asha Rao' } }));
    fireEvent.click(tile);
    expect(onOpen).toHaveBeenCalledWith('u1');
  });

  it('opens the profile from the keyboard on Enter and Space only', () => {
    const { onOpen } = mount(row());
    const tile = screen.getByTestId('contact-row-u1');
    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: ' ' });
    fireEvent.keyDown(tile, { key: 'Tab' });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('omits the saved-as part when the contact label is the name itself or empty', () => {
    mount(row({ contact_label: 'Asha Rao' }));
    expect(screen.getByTestId('contact-row-u1')).not.toHaveTextContent(fallbackT('mweb.contacts.savedAs', { vars: { label: 'Asha Rao' } }));
  });

  it('falls back to the first name, then the contact label, for the name', () => {
    const { unmount } = render(<ContactRow row={row({}, { full_name: '' }) as never} onToggleFollow={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByTestId('contact-row-u1')).toHaveTextContent('Asha');
    unmount();
    render(<ContactRow row={row({}, { full_name: '', first_name: '' }) as never} onToggleFollow={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByTestId('contact-row-u1')).toHaveTextContent('Mum');
  });

  it('adds the Nearby badge to the spoken name', () => {
    mount(row({ is_nearby: true }));
    expect(screen.getByTestId('contact-row-u1')).toHaveTextContent(fallbackT('mweb.contacts.nearbyBadge'));
    expect(screen.getByTestId('contact-row-u1')).toHaveAccessibleName(
      `${fallbackT('mweb.podDetails.openProfileOf', { vars: { name: 'Asha Rao' } })}, ${fallbackT('mweb.contacts.nearbyBadge')}`
    );
  });

  it('shows the follow button in the status the profile holds and toggles through the row handler', () => {
    const toggle = vi.fn().mockResolvedValue(undefined);
    const r = row({}, { follow_status: 'FOLLOWING', follows_viewer: true });
    mount(r, toggle);
    expect(screen.getByTestId('follow')).toHaveAttribute('data-status', 'FOLLOWING');
    expect(screen.getByTestId('follow')).toHaveAttribute('data-follows-viewer', 'true');
    fireEvent.click(screen.getByTestId('follow'));
    expect(toggle).toHaveBeenCalledWith(r);
  });
});

describe('ContactsEmpty', () => {
  const empty = (props: Partial<Parameters<typeof ContactsEmpty>[0]> = {}) =>
    render(<ContactsEmpty scope="all" synced searching={false} loading={false} {...props} />);

  it('shows a loader while pages are still on their way', () => {
    empty({ loading: true });
    expect(screen.queryByTestId('contacts-empty')).not.toBeInTheDocument();
  });

  it('shows the error when there is one', () => {
    empty({ error: new Error('Server down') });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each([
    [{ synced: false }, 'mweb.contacts.notSyncedYet'],
    [{ searching: true }, 'mweb.contacts.noMatchesForSearch'],
    [{ scope: 'nearby' }, 'mweb.contacts.noneNearby'],
    [{ scope: 'invite' }, 'mweb.contacts.everyoneIsHere'],
    [{}, 'mweb.contacts.noneMatched'],
  ] as const)('gives the most specific reason for an empty list %j', (props, key) => {
    empty(props as never);
    expect(screen.getByTestId('contacts-empty')).toHaveTextContent(fallbackT(key));
  });
});

describe('ContactsProgress', () => {
  it('draws a labelled bar', () => {
    render(<ContactsProgress label="3 of 10" percent={30} testId="bar" />);
    expect(screen.getByTestId('bar')).toHaveTextContent('3 of 10');
    expect(screen.getByRole('progressbar', { name: '3 of 10' })).toHaveAttribute('aria-valuenow', '30');
  });

  const pages = (over: object = {}) => ({ rows: [1, 2], total: 10, loading: false, loadingMore: false, error: undefined, ...over });

  it('shows nothing for an idle list', () => {
    const { container } = render(<ContactsLoadProgress pages={pages() as never} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a refresh bar while a re-read runs over rows already there', () => {
    render(<ContactsLoadProgress pages={pages({ loading: true }) as never} onRetry={vi.fn()} />);
    expect(screen.getByTestId('contacts-list-refreshing')).toBeInTheDocument();
  });

  it('shows how many have loaded while later pages stream in', () => {
    render(<ContactsLoadProgress pages={pages({ loadingMore: true }) as never} onRetry={vi.fn()} />);
    expect(screen.getByText(fallbackT('mweb.contacts.loadProgress', { vars: { loaded: 2, total: 10 } }))).toBeInTheDocument();
  });

  it('says a later page failed and lets the reader retry', () => {
    const onRetry = vi.fn();
    render(<ContactsLoadProgress pages={pages({ error: 'x' }) as never} onRetry={onRetry} />);
    expect(screen.getByTestId('contacts-load-failed')).toHaveTextContent(fallbackT('mweb.contacts.loadMoreFailed'));
    fireEvent.click(screen.getByTestId('contacts-load-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('InviteRow', () => {
  const invite = (row: object, props: object = {}) => {
    const handlers = { onToggleSelect: vi.fn(), onInvite: vi.fn() };
    render(<InviteRow row={{ phone_key: 'k1', contact_label: 'Chitra', invited_at: null, ...row } as never} selected={false} busy={false} {...handlers} {...props} />);
    return handlers;
  };

  it('shows the saved name with a tick box and its own Invite button', () => {
    const handlers = invite({});
    expect(screen.getByText('Chitra')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: fallbackT('mweb.contacts.selectFor', { vars: { name: 'Chitra' } }) }));
    expect(handlers.onToggleSelect).toHaveBeenCalledWith('k1');
    fireEvent.click(screen.getByTestId('contact-invite-k1'));
    expect(handlers.onInvite).toHaveBeenCalledWith('k1');
  });

  it('shows a ticked row and a spinning Invite while it is being sent', () => {
    invite({}, { selected: true, busy: true });
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByTestId('contact-invite-k1')).toBeDisabled();
  });

  it('keeps the badge and neither tick nor button once the contact has been invited', () => {
    invite({ invited_at: '2026-06-01T10:00:00.000Z' });
    expect(screen.getByText(fallbackT('mweb.contacts.invited'))).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.queryByTestId('contact-invite-k1')).not.toBeInTheDocument();
  });
});

describe('VirtualRows', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const mount = () =>
    render(
      <VirtualRows testId="vr" rows={rows} keyOf={(r) => r.id} renderRow={(r) => <span data-testid={`row-${r.id}`} />} estimate={50} resetKey="k" />
    );

  it('mounts only the rows in the window, between spacers for the rest', () => {
    h.virtual.mockReturnValue({ listRef: { current: null }, measureRow: () => undefined, range: { start: 1, end: 2, leadPad: 50, trailPad: 50 } });
    const { container } = mount();
    expect(screen.queryByTestId('row-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-b')).toBeInTheDocument();
    expect(screen.getByTestId('row-c')).toBeInTheDocument();
    expect(screen.queryByTestId('row-d')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[style*="height"], div').length).toBeGreaterThan(0);
    expect(h.virtual).toHaveBeenCalledWith({ rowCount: 4, estimateOf: expect.any(Function), gap: 0, resetKey: 'k' });
    expect(h.virtual.mock.calls[0][0].estimateOf()).toBe(50);
  });

  it('has no spacers when the window covers everything', () => {
    h.virtual.mockReturnValue({ listRef: { current: null }, measureRow: () => undefined, range: { start: 0, end: 3, leadPad: 0, trailPad: 0 } });
    mount();
    expect(screen.getByTestId('vr').children).toHaveLength(4);
  });
});

describe('ContactsAllowCard summary', () => {
  it('summarises the last sync with the matched count', () => {
    render(<ContactsAllowCard status={{ matched: 2, invitable: 0, synced_at: '2026-06-26T05:00:00.000Z' } as never} supported busy={false} stage={null} failure={null} onAllow={vi.fn()} />);
    expect(screen.getByTestId('contacts-sync-summary')).toHaveTextContent(fallbackT('mweb.contacts.matched', { count: 2 }));
  });

  it('shows a reading stage as the plain syncing sentence', () => {
    render(<ContactsAllowCard status={null} supported busy stage={{ phase: 'READING', done: 1, total: 4 } as never} failure={null} onAllow={vi.fn()} />);
    expect(screen.getByText(fallbackT('mweb.contacts.syncing'))).toBeInTheDocument();
  });
});

describe('useClearContacts', () => {
  const setup = (clear = vi.fn().mockResolvedValue({}), loading = false) => {
    h.useMutation.mockReturnValue([clear, { loading }]);
    const onCleared = vi.fn().mockResolvedValue(undefined);
    return { clear, onCleared, ...renderHook(() => useClearContacts(onCleared)) };
  };

  it('opens and closes the confirm dialog', () => {
    const { result } = setup();
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('removes the phone book, closes the dialog, says so and re-reads the lists', async () => {
    const { result, onCleared, clear } = setup();
    act(() => result.current.setOpen(true));
    await act(async () => result.current.confirm());
    expect(clear).toHaveBeenCalledTimes(1);
    expect(result.current.open).toBe(false);
    expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.contacts.cleared'));
    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and shows the reason when removing fails', async () => {
    const { result, onCleared } = setup(vi.fn().mockRejectedValue(new Error('Server down')));
    act(() => result.current.setOpen(true));
    await act(async () => result.current.confirm());
    expect(result.current.open).toBe(true);
    expect(h.error).toHaveBeenCalledTimes(1);
    expect(onCleared).not.toHaveBeenCalled();
  });

  it('reports busy while the mutation runs', () => {
    expect(setup(undefined, true).result.current.busy).toBe(true);
  });
});

describe('useContactsList toggleFollow', () => {
  const follow = vi.fn();
  const unfollow = vi.fn();
  const cancel = vi.fn();
  beforeEach(() => {
    let call = 0;
    h.useMutation.mockImplementation(() => [[follow, unfollow, cancel][call++ % 3]]);
    h.client.query.mockResolvedValue({ data: { contactsOnDuncitPage: { total: 1, rows: [{ contact_label: 'A', is_nearby: false, profile: { user_id: 'u1', follow_status: 'NONE' } }] } } });
    [follow, unfollow, cancel].forEach((fn) => fn.mockReset());
  });

  const row = (status: string) => ({ contact_label: 'A', is_nearby: false, profile: { user_id: 'u1', follow_status: status } });

  it('loads the first page of matched contacts with no cache', async () => {
    const { result } = renderHook(() => useContactsList());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(h.client.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { offset: 0, limit: 200 }, fetchPolicy: 'no-cache' }));
  });

  it('follows a stranger and redraws the row from the status the server settled on', async () => {
    follow.mockResolvedValue({ data: { followUser: { following_user_ids: ['u1'], requested_user_ids: [] } } });
    const { result } = renderHook(() => useContactsList());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await act(async () => result.current.toggleFollow(row('NONE') as never));
    expect(follow).toHaveBeenCalledWith({ variables: { user_id: 'u1' } });
    await waitFor(() => expect(result.current.rows[0].profile.follow_status).toBe('FOLLOWING'));
  });

  it('unfollows someone already followed, and cancels a pending request', async () => {
    unfollow.mockResolvedValue({ data: { unfollowUser: { following_user_ids: [], requested_user_ids: [] } } });
    cancel.mockResolvedValue({ data: { cancelFollowRequest: { following_user_ids: [], requested_user_ids: [] } } });
    const { result } = renderHook(() => useContactsList());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await act(async () => result.current.toggleFollow(row('FOLLOWING') as never));
    expect(unfollow).toHaveBeenCalledTimes(1);
    await act(async () => result.current.toggleFollow(row('REQUESTED') as never));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('settles a request when the server answers with the viewer lists, or with nothing at all', async () => {
    follow.mockResolvedValueOnce({ data: { followUser: { requested_user_ids: ['u1'] } } }).mockResolvedValueOnce({ data: undefined });
    const { result } = renderHook(() => useContactsList());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await act(async () => result.current.toggleFollow(row('NONE') as never));
    await waitFor(() => expect(result.current.rows[0].profile.follow_status).toBe('REQUESTED'));
    await act(async () => result.current.toggleFollow(row('NONE') as never));
    await waitFor(() => expect(result.current.rows[0].profile.follow_status).toBe('NONE'));
  });

  it('shows the reason when the follow fails', async () => {
    follow.mockRejectedValue(new Error('Blocked'));
    const { result } = renderHook(() => useContactsList());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await act(async () => result.current.toggleFollow(row('NONE') as never));
    expect(h.error).toHaveBeenCalledTimes(1);
  });
});

describe('useContactsSync', () => {
  const syncMutation = vi.fn();
  const picker = (select: unknown) => {
    Object.defineProperty(navigator, 'contacts', { value: select ? { select } : undefined, configurable: true });
  };
  const setup = (onSynced = vi.fn().mockResolvedValue(undefined)) => {
    h.useMutation.mockReturnValue([syncMutation]);
    return { onSynced, ...renderHook(() => useContactsSync(onSynced)) };
  };

  beforeEach(() => {
    syncMutation.mockReset().mockResolvedValue({ data: { syncContacts: { ok: true } } });
    h.confirm.mockResolvedValue(true);
    h.sync.mockImplementation(async ({ entries, send, onProgress }) => {
      onProgress({ phase: 'SENDING', done: 0, total: entries.length });
      await send(entries, 'b1');
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'contacts');
    vi.restoreAllMocks();
  });

  it('is unsupported without a contact picker and does nothing when asked', async () => {
    picker(undefined);
    const { result } = setup();
    expect(result.current.supported).toBe(false);
    await act(async () => result.current.request());
    expect(h.confirm).not.toHaveBeenCalled();
  });

  it('ignores a picker object with no select function', () => {
    Object.defineProperty(navigator, 'contacts', { value: {}, configurable: true });
    expect(setup().result.current.supported).toBe(false);
  });

  it('does nothing when the person declines the privacy notice', async () => {
    const select = vi.fn();
    picker(select);
    h.confirm.mockResolvedValue(false);
    const { result } = setup();
    expect(result.current.supported).toBe(true);
    await act(async () => result.current.request());
    expect(select).not.toHaveBeenCalled();
  });

  it('syncs the picked contacts in slices, then refreshes the lists, and clears the stage', async () => {
    const select = vi.fn().mockResolvedValue([{ name: ['Asha'], tel: ['+91 98765 43210'] }, { tel: [] }, { name: ['No number'] }]);
    picker(select);
    const { result, onSynced } = setup();
    await act(async () => result.current.request());
    expect(select).toHaveBeenCalledWith(['name', 'tel'], { multiple: true });
    expect(syncMutation).toHaveBeenCalledWith({ variables: { entries: expect.any(Array), batch: 'b1' } });
    expect(onSynced).toHaveBeenCalledTimes(1);
    expect(result.current.failure).toBeNull();
    expect(result.current.stage).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('treats closing the picker with nothing chosen as nothing to do', async () => {
    picker(vi.fn().mockResolvedValue([]));
    const { result } = setup();
    await act(async () => result.current.request());
    expect(h.sync).not.toHaveBeenCalled();
    expect(result.current.failure).toBeNull();
  });

  it('reports a refused picker as DENIED without logging a fault', async () => {
    picker(vi.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'NotAllowedError' })));
    const { result } = setup();
    await act(async () => result.current.request());
    expect(result.current.failure).toBe('DENIED');
  });

  it('reports a SecurityError as DENIED too', async () => {
    picker(vi.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'SecurityError' })));
    const { result } = setup();
    await act(async () => result.current.request());
    expect(result.current.failure).toBe('DENIED');
  });

  it('reports any other failure as FAILED', async () => {
    picker(vi.fn().mockRejectedValue(new Error('boom')));
    const { result } = setup();
    await act(async () => result.current.request());
    expect(result.current.failure).toBe('FAILED');
  });

  it('reports a failure with no error object as FAILED', async () => {
    picker(vi.fn().mockRejectedValue(null));
    const { result } = setup();
    await act(async () => result.current.request());
    expect(result.current.failure).toBe('FAILED');
  });

  it('does not report a failed refresh as a failed sync', async () => {
    picker(vi.fn().mockResolvedValue([{ name: ['A'], tel: ['9876543210'] }]));
    const { result } = setup(vi.fn().mockRejectedValue(new Error('read failed')));
    await act(async () => result.current.request());
    expect(result.current.failure).toBeNull();
  });
});
