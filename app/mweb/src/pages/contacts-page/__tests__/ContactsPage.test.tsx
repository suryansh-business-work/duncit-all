import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import ContactsPage from '../index';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  list: vi.fn(),
  invite: vi.fn(),
  sync: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
}));
vi.mock('../useContactsList', () => ({ useContactsList: h.list }));
vi.mock('../useContactsInvite', () => ({ useContactsInvite: h.invite }));
vi.mock('../useContactsSync', () => ({ useContactsSync: h.sync }));
vi.mock('../useClearContacts', () => ({ useClearContacts: h.clear }));
vi.mock('../../../components/FollowButton', () => ({ default: () => <span data-testid="follow-stub" /> }));

const contactRow = (id: string, name: string, nearby: boolean) => ({
  contact_label: name,
  is_nearby: nearby,
  profile: { user_id: id, username: id, full_name: name, first_name: name, follow_status: 'NONE' },
});

const pages = (over: object = {}) => ({
  rows: [],
  total: 0,
  loading: false,
  loadingMore: false,
  error: undefined,
  reload: vi.fn().mockResolvedValue(undefined),
  ...over,
});

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderPage = (url = '/contacts') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/u/:id" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const SYNCED = {
  myContactsSync: { synced_at: '2026-06-26T05:00:00.000Z', submitted: 9, matched: 2, invitable: 1 },
  me: { user_id: 'me', full_name: 'Me Myself', first_name: 'Me', profile_photo: null },
};

let refetch: ReturnType<typeof vi.fn>;
let setOpen: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  refetch = vi.fn().mockResolvedValue(undefined);
  setOpen = vi.fn();
  h.useQuery.mockReturnValue({ data: SYNCED, refetch });
  h.list.mockReturnValue(
    pages({
      rows: [contactRow('u1', 'Asha Rao', true), contactRow('u2', 'Bela Shah', false)],
      reload: vi.fn().mockResolvedValue(undefined),
      toggleFollow: vi.fn(),
    })
  );
  h.invite.mockReturnValue(
    pages({
      rows: [],
      selected: [],
      busyKey: null,
      bulkBusy: false,
      toggleSelect: vi.fn(),
      inviteRow: vi.fn(),
      inviteSelected: vi.fn(),
    })
  );
  h.sync.mockReturnValue({ supported: true, request: vi.fn(), busy: false, stage: null, failure: null });
  h.clear.mockReturnValue({ open: false, setOpen, busy: false, confirm: vi.fn() });
});

describe('ContactsPage', () => {
  it('lists every matched contact with the radar and the clear action once synced', () => {
    renderPage();
    expect(screen.getByTestId('contacts-title')).toHaveTextContent(fallbackT('mweb.contacts.title'));
    expect(screen.getByTestId('contact-row-u1')).toBeInTheDocument();
    expect(screen.getByTestId('contact-row-u2')).toBeInTheDocument();
    expect(screen.getByTestId('contacts-clear')).toBeInTheDocument();
    expect(h.invite).toHaveBeenCalledWith(false);
  });

  it('narrows to nearby contacts on the Nearby tab', () => {
    renderPage('/contacts?selectedtab=nearby');
    expect(screen.getByTestId('contact-row-u1')).toBeInTheDocument();
    expect(screen.queryByTestId('contact-row-u2')).not.toBeInTheDocument();
  });

  it('filters by the debounced search text and opens a profile from a row', async () => {
    renderPage();
    fireEvent.change(screen.getByTestId('contacts-search'), { target: { value: 'bela' } });
    await waitFor(() => expect(screen.queryByTestId('contact-row-u1')).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId('contact-row-u2'));
    expect(screen.getByTestId('where')).toHaveTextContent('/u/u2');
  });

  it('says there are no matches for a search that finds nobody', async () => {
    renderPage();
    fireEvent.change(screen.getByTestId('contacts-search'), { target: { value: 'zzzz' } });
    expect(await screen.findByText(fallbackT('mweb.contacts.noMatchesForSearch'))).toBeInTheDocument();
  });

  it('shows the not-synced prompt and no clear button before a first sync', () => {
    h.useQuery.mockReturnValue({ data: { myContactsSync: null, me: SYNCED.me }, refetch });
    h.list.mockReturnValue(pages({ rows: [], reload: vi.fn(), toggleFollow: vi.fn() }));
    renderPage();
    expect(screen.getByTestId('contacts-empty')).toHaveTextContent(fallbackT('mweb.contacts.notSyncedYet'));
    expect(screen.queryByTestId('contacts-clear')).not.toBeInTheDocument();
  });

  it('shows the list error only while nothing has loaded', () => {
    h.list.mockReturnValue(
      pages({ rows: [], error: new Error('boom'), reload: vi.fn(), toggleFollow: vi.fn() })
    );
    renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the invite list with its bar and reloads invites after a resync', async () => {
    const reloadInvites = vi.fn().mockResolvedValue(undefined);
    const reloadContacts = vi.fn().mockResolvedValue(undefined);
    h.list.mockReturnValue(pages({ rows: [contactRow('u1', 'Asha', true)], reload: reloadContacts, toggleFollow: vi.fn() }));
    h.invite.mockReturnValue(
      pages({
        rows: [{ phone_key: 'k1', contact_label: 'Chitra', invited_at: null }],
        reload: reloadInvites,
        selected: ['k1'],
        busyKey: null,
        bulkBusy: false,
        toggleSelect: vi.fn(),
        inviteRow: vi.fn(),
        inviteSelected: vi.fn(),
      })
    );
    renderPage('/contacts?selectedtab=invite');
    expect(h.invite).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('contacts-invite-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('contact-row-u1')).not.toBeInTheDocument();

    const refreshAll = h.sync.mock.calls[0][0] as () => Promise<unknown>;
    await refreshAll();
    expect(refetch).toHaveBeenCalled();
    expect(reloadContacts).toHaveBeenCalled();
    expect(reloadInvites).toHaveBeenCalled();
  });

  it('opens the clear dialog from the button and closes it on cancel', () => {
    h.clear.mockReturnValue({ open: true, setOpen, busy: false, confirm: vi.fn() });
    renderPage();
    fireEvent.click(screen.getByTestId('contacts-clear'));
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('contacts-clear-dialog')).toBeInTheDocument();
  });

  it('falls back to the first name for the radar when there is no full name', () => {
    h.useQuery.mockReturnValue({
      data: { ...SYNCED, me: { user_id: 'me', full_name: '', first_name: '', profile_photo: null } },
      refetch,
    });
    renderPage();
    expect(screen.getByTestId('contact-row-u1')).toBeInTheDocument();
  });
});
