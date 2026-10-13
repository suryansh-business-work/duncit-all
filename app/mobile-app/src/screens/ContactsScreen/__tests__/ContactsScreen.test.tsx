import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  ClearMyContactsDocument,
  ContactsOnDuncitPageDocument,
  ContactsToInvitePageDocument,
  InviteContactsDocument,
  MyContactsSyncDocument,
} from '@/graphql/contacts';
import { MobileFollowUserDocument } from '@/graphql/hosts-venues';
import { ContactsScreen } from '@/screens/ContactsScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => true,
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

// Reading the device phone book is native; the screen only needs its outcome.
const mockSync = {
  supported: true,
  request: jest.fn(),
  asking: false,
  agree: jest.fn().mockResolvedValue(undefined),
  decline: jest.fn(),
  busy: false,
  stage: null,
  failure: null,
};
jest.mock('@/hooks/useContactsSync', () => ({ useContactsSync: () => mockSync }));

const mockRequest = graphqlRequest as jest.Mock;

const profile = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  user_id: id,
  username: name.toLowerCase(),
  full_name: name,
  first_name: name,
  profile_photo: null,
  city: 'Pune',
  is_following: false,
  follow_status: 'NONE',
  follows_viewer: false,
  ...over,
});
const match = (id: string, name: string, nearby = false) => ({
  contact_label: name,
  is_nearby: nearby,
  profile: profile(id, name),
});

const MATCHES = [match('u1', 'Asha', true), match('u2', 'Ravi'), match('u3', 'Meera', true)];
const INVITES = [
  { phone_key: '9000000001', contact_label: 'Kabir', invited_at: null },
  { phone_key: '9000000002', contact_label: 'Zoya', invited_at: null },
];

interface World {
  status: unknown;
  follow: unknown;
  invite: unknown;
}
let world: World;

beforeEach(() => {
  mockNavigate.mockReset();
  mockRequest.mockReset();
  mockSync.request.mockReset();
  mockSync.agree.mockClear();
  mockSync.decline.mockClear();
  mockSync.asking = false;
  world = {
    status: { synced_at: '2026-03-01T00:00:00.000Z', submitted: 20, matched: 3, invitable: 2 },
    follow: { followUser: { following_user_ids: ['u2'], requested_user_ids: [] } },
    invite: { inviteContacts: { sent: 1, sent_keys: ['9000000001'] } },
  };
  mockRequest.mockImplementation(async (doc: unknown) => {
    if (doc === MyContactsSyncDocument) return { myContactsSync: world.status, me: null };
    if (doc === ContactsOnDuncitPageDocument) {
      return { contactsOnDuncitPage: { total: MATCHES.length, rows: MATCHES } };
    }
    if (doc === ContactsToInvitePageDocument) {
      return { contactsToInvitePage: { total: INVITES.length, rows: INVITES } };
    }
    if (doc === MobileFollowUserDocument) {
      if (world.follow instanceof Error) throw world.follow;
      return world.follow;
    }
    if (doc === InviteContactsDocument) return world.invite;
    if (doc === ClearMyContactsDocument) return { clearMyContacts: true };
    return {};
  });
});

const waitRows = () =>
  waitFor(() => expect(screen.getByTestId('contact-row-u1')).toBeOnTheScreen());
const calls = (doc: unknown) => mockRequest.mock.calls.filter((c) => c[0] === doc);

describe('ContactsScreen', () => {
  it('lists the matched contacts and opens a profile', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    expect(screen.getByTestId('contact-row-u2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('contact-open-u2'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'u2' });
  });

  it('narrows to the nearby matches', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.press(screen.getByTestId('contacts-scope-nearby'));
    await waitFor(() => expect(screen.queryByTestId('contact-row-u2')).toBeNull());
    expect(screen.getByTestId('contact-row-u1')).toBeOnTheScreen();
    expect(screen.getByTestId('contact-row-u3')).toBeOnTheScreen();
  });

  it('filters by what is typed once typing pauses, and says when nothing matches', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.changeText(screen.getByTestId('contacts-search'), 'rav');
    await waitFor(() => expect(screen.queryByTestId('contact-row-u1')).toBeNull());
    expect(screen.getByTestId('contact-row-u2')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('contacts-search'), 'zzz');
    await waitFor(() => expect(screen.getByTestId('contacts-empty')).toBeOnTheScreen());
  });

  it('follows a contact and redraws only that row with the status the server settled on', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    const before = screen.getByTestId('contact-follow-u2');
    const beforeText = before.props.accessibilityLabel ?? before.props['aria-label'];
    await act(async () => {
      fireEvent.press(before);
    });
    await waitFor(() => expect(calls(MobileFollowUserDocument)).toHaveLength(1));
    expect(calls(MobileFollowUserDocument)[0][1]).toEqual({ user_id: 'u2' });
    await waitFor(() => {
      const after = screen.getByTestId('contact-follow-u2');
      const afterText = after.props.accessibilityLabel ?? after.props['aria-label'];
      expect(afterText).not.toBe(beforeText);
    });
    const untouched = screen.getByTestId('contact-follow-u1');
    expect(untouched.props.accessibilityLabel ?? untouched.props['aria-label']).toBe(
      screen.getByTestId('contact-follow-u3').props.accessibilityLabel ??
        screen.getByTestId('contact-follow-u3').props['aria-label'],
    );
  });

  it('leaves the row unchanged and responsive when a follow fails', async () => {
    world.follow = new Error('Rate limited');
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    const btn = screen.getByTestId('contact-follow-u1');
    const label = btn.props.accessibilityLabel ?? btn.props['aria-label'];
    await act(async () => {
      fireEvent.press(btn);
    });
    await waitFor(() => expect(calls(MobileFollowUserDocument)).toHaveLength(1));
    const again = screen.getByTestId('contact-follow-u1');
    expect(again.props.accessibilityLabel ?? again.props['aria-label']).toBe(label);
  });

  it('the invite tab lists numbers to invite and sends one invite', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.press(screen.getByTestId('contacts-scope-invite'));
    await waitFor(() =>
      expect(screen.getByTestId('contact-invite-row-9000000001')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('contacts-radar')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('contact-invite-9000000001'));
    });
    await waitFor(() => expect(calls(InviteContactsDocument)).toHaveLength(1));
    expect(calls(InviteContactsDocument)[0][1]).toEqual({ phone_keys: ['9000000001'] });
    await waitFor(() => expect(screen.getByTestId('contacts-invite-result')).toBeOnTheScreen());
  });

  it('invites the ticked numbers together', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.press(screen.getByTestId('contacts-scope-invite'));
    await waitFor(() =>
      expect(screen.getByTestId('contact-invite-row-9000000002')).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId('contact-invite-select-9000000001'));
    fireEvent.press(screen.getByTestId('contact-invite-select-9000000002'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('contacts-invite-selected'));
    });
    await waitFor(() => expect(calls(InviteContactsDocument)).toHaveLength(1));
    expect(calls(InviteContactsDocument)[0][1]).toEqual({
      phone_keys: ['9000000001', '9000000002'],
    });
  });

  it('removes the synced contacts only after confirmation, then re-reads', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.press(screen.getByTestId('contacts-clear'));
    expect(calls(ClearMyContactsDocument)).toHaveLength(0);
    const statusReads = calls(MyContactsSyncDocument).length;
    await act(async () => {
      fireEvent.press(screen.getByTestId('contacts-clear-dialog-confirm'));
    });
    await waitFor(() => expect(calls(ClearMyContactsDocument)).toHaveLength(1));
    await waitFor(() => expect(calls(MyContactsSyncDocument).length).toBeGreaterThan(statusReads));
  });

  it('cancelling the removal keeps the contacts', async () => {
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.press(screen.getByTestId('contacts-clear'));
    fireEvent.press(screen.getByTestId('contacts-clear-dialog-cancel'));
    expect(calls(ClearMyContactsDocument)).toHaveLength(0);
  });

  it('offers no clear button before anything has been synced', async () => {
    world.status = null;
    renderWithProviders(<ContactsScreen />);
    await waitFor(() => expect(calls(MyContactsSyncDocument).length).toBeGreaterThan(0));
    await waitRows();
    expect(screen.queryByTestId('contacts-clear')).toBeNull();
  });

  it('asks the sync to start from the allow card and answers the consent dialog', async () => {
    mockSync.asking = true;
    renderWithProviders(<ContactsScreen />);
    await waitRows();
    fireEvent.press(screen.getByTestId('contacts-allow-button'));
    expect(mockSync.request).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('contacts-consent-dialog-cancel'));
    expect(mockSync.decline).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(screen.getByTestId('contacts-consent-dialog-confirm'));
    });
    expect(mockSync.agree).toHaveBeenCalledTimes(1);
  });
});
