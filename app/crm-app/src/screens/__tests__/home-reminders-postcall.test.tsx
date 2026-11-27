import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { gqlRequest } from '@/services/graphql.client';
import { syncDeviceCalls } from '@/services/call-sync';
import { hasPhoneFeatures, readPermissions, requestGroups } from '@/services/permissions';
import { STORAGE_KEYS } from '@/services/secure-storage';
import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { useFeaturesStore } from '@/stores/features.store';
import { usePostCallStore } from '@/stores/postCall.store';
import { HomeScreen } from '../home/HomeScreen';
import { RemindersScreen } from '../reminders/RemindersScreen';
import { PostCallScreen } from '../post-call/PostCallScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/call-sync', () => ({ syncDeviceCalls: jest.fn() }));
jest.mock('@/services/permissions', () => ({
  ...jest.requireActual('@/services/permissions'),
  readPermissions: jest.fn(),
  hasPhoneFeatures: jest.fn(),
  requestGroups: jest.fn().mockResolvedValue(undefined),
}));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  setOptions: jest.fn(),
  // The tab screens listen for being switched to (scroll back to the top).
  getState: jest.fn(() => ({ index: 0 })),
  addListener: jest.fn(() => jest.fn()),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

const request = gqlRequest as jest.Mock;
const future = new Date(Date.now() + 3_600_000).toISOString();
const past = new Date(Date.now() - 3_600_000).toISOString();
const reminder = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  entity_type: 'VENUE_LEAD',
  lead_id: 'v1',
  title: 'Call Rohit',
  due_at: future,
  notes: null,
  status: 'PENDING',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (hasPhoneFeatures as jest.Mock).mockReturnValue(true);
  (readPermissions as jest.Mock).mockResolvedValue({
    phone: true,
    call: true,
    overlay: true,
    notifications: true,
    audio: true,
  });
});

describe('HomeScreen', () => {
  it('greets by name and lists what is due today', async () => {
    useAuthStore.setState({ user: { user_id: 'u1', first_name: 'Asha', roles: ['CRM_MANAGER'] } });
    request.mockResolvedValue({ crmReminders: [reminder()] });
    renderWithTheme(<HomeScreen />);
    expect(screen.getByText('Hello, Asha')).toBeOnTheScreen();
    expect(await screen.findByText('Call Rohit')).toBeOnTheScreen();
    expect(request.mock.calls[0][1].filter.status).toBe('PENDING');
  });

  it('nudges to finish phone set-up until the phone permissions are given', async () => {
    (readPermissions as jest.Mock).mockResolvedValue({ phone: false, call: true });
    request.mockResolvedValue({ crmReminders: [] });
    renderWithTheme(<HomeScreen />);
    expect(await screen.findByTestId('home-setup')).toBeOnTheScreen();
    expect(screen.getByText('Nothing due today.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-dialer'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Tabs', { screen: 'Dialer' });
  });

  it('opens the dialer, the lead search, a new follow-up and the dashboard from its quick actions', async () => {
    request.mockResolvedValue({ crmReminders: [] });
    renderWithTheme(<HomeScreen />);
    await screen.findByText('Nothing due today.');
    fireEvent.press(screen.getByTestId('home-leads'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('Tabs', { screen: 'Leads' });
    fireEvent.press(screen.getByTestId('home-add-reminder'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('AddReminder', {});
    fireEvent.press(screen.getByTestId('home-dashboard'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('Dashboard');
    expect(screen.queryByTestId('home-due-count')).toBeNull();
  });

  it('counts what is due, and Set up asks for every missing permission in one prompt', async () => {
    (readPermissions as jest.Mock)
      .mockResolvedValueOnce({ phone: true, call: false, audio: true })
      .mockResolvedValue({ phone: true, call: true, audio: true });
    request.mockResolvedValue({
      crmReminders: [reminder(), reminder({ id: 'r2', title: 'Later' })],
    });
    renderWithTheme(<HomeScreen />);
    expect(await screen.findByTestId('home-due-count')).toHaveTextContent('2');
    fireEvent.press(within(screen.getByTestId('home-setup')).getByText('Set up'));
    // Recordings are on by default, so audio access is asked for with the rest.
    expect(requestGroups).toHaveBeenCalledWith(['phone', 'call', 'notifications', 'audio']);
    // Once granted, the nudge goes away on the re-check.
    await waitFor(() => expect(screen.queryByTestId('home-setup')).toBeNull());
    expect(mockNav.navigate).not.toHaveBeenCalledWith('Settings');
  });

  it('nudges while audio access is missing and recordings are on, not once they are off', async () => {
    (readPermissions as jest.Mock).mockResolvedValue({ phone: true, call: true, audio: false });
    request.mockResolvedValue({ crmReminders: [] });
    const { unmount } = renderWithTheme(<HomeScreen />);
    expect(await screen.findByTestId('home-setup')).toBeOnTheScreen();
    unmount();
    useFeaturesStore.setState({ recordings: false });
    renderWithTheme(<HomeScreen />);
    await screen.findByText('Nothing due today.');
    expect(screen.queryByTestId('home-setup')).toBeNull();
    useFeaturesStore.setState({ recordings: true });
  });

  it('on an iPhone never asks for the Android phone permissions or nudges about them', async () => {
    (hasPhoneFeatures as jest.Mock).mockReturnValue(false);
    request.mockResolvedValue({ crmReminders: [] });
    renderWithTheme(<HomeScreen />);
    expect(await screen.findByText('Nothing due today.')).toBeOnTheScreen();
    expect(readPermissions).not.toHaveBeenCalled();
    expect(screen.queryByTestId('home-setup')).toBeNull();
    expect(screen.getByTestId('home-dialer')).toBeOnTheScreen();
  });
});

describe('RemindersScreen', () => {
  it('lists pending reminders soonest first, flags overdue, and ticks one done', async () => {
    request.mockImplementation(async (_doc: unknown, vars: { id?: string }) =>
      vars.id
        ? { toggleCrmReminderDone: { id: vars.id, status: 'DONE' } }
        : {
            crmReminders: [
              reminder({ id: 'r2', title: 'Later' }),
              reminder({ id: 'r1', title: 'Overdue one', due_at: past }),
            ],
          },
    );
    renderWithTheme(<RemindersScreen />);
    const titles = await screen.findAllByText(/Later|Overdue one/);
    expect(titles.map((n) => n.props.children)).toEqual(['Overdue one', 'Later']);
    expect(screen.getByText(/Overdue ·/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reminder-toggle-r1'));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.anything(), { id: 'r1' }));
  });

  it('opens a reminder’s lead and adds a new reminder', async () => {
    request.mockResolvedValue({ crmReminders: [reminder()] });
    renderWithTheme(<RemindersScreen />);
    fireEvent.press(await screen.findByText('Call Rohit'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'VENUE_LEAD', id: 'v1' });
    fireEvent.press(screen.getByTestId('reminders-add'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddReminder', {});
  });
});

describe('PostCallScreen', () => {
  const ended = {
    number: '9811000001',
    direction: 'INBOUND' as const,
    answered: true,
    startedAt: 0,
    endedAt: 134_000,
    entityType: 'VENUE_LEAD',
    leadId: 'v1',
    leadName: 'Smash Arena',
    contactName: 'Rohit',
  };

  const secureStore = (SecureStore as unknown as { __store: Map<string, string> }).__store;
  /** The sync status the call sync leaves behind: which calls the server accepted. */
  const loggedNow = (number: string, startedAt: number) =>
    secureStore.set(
      STORAGE_KEYS.syncStatus,
      JSON.stringify({
        callAt: 1,
        recordingAt: null,
        recent: [{ k: number, d: startedAt }],
        failures: [],
      }),
    );

  beforeEach(() => {
    secureStore.delete(STORAGE_KEYS.syncStatus);
    useFeaturesStore.setState({ autoLog: true });
    (syncDeviceCalls as jest.Mock).mockClear();
  });

  it('saves the call and offers a note, a reminder and the lead', async () => {
    usePostCallStore.setState({ pending: ended });
    (syncDeviceCalls as jest.Mock).mockImplementation(async () => {
      loggedNow('9811000001', 5_000);
      return { failed: false, logged: 1 };
    });
    renderWithTheme(<PostCallScreen />);
    expect(screen.getByText('Call with Smash Arena')).toBeOnTheScreen();
    expect(screen.getByText('Lasted 2:14')).toBeOnTheScreen();
    expect(await screen.findByText('Call saved to the CRM')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('post-call-note'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddNote', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
    });
    fireEvent.press(screen.getByTestId('post-call-reminder'));
    expect(mockNav.navigate).toHaveBeenCalledWith(
      'AddReminder',
      expect.objectContaining({ title: 'Call with Smash Arena' }),
    );
  });

  it('says when the call could not be saved, and Done clears it', async () => {
    usePostCallStore.setState({
      pending: {
        ...ended,
        answered: false,
        entityType: undefined,
        leadId: undefined,
        leadName: undefined,
      },
    });
    (syncDeviceCalls as jest.Mock).mockResolvedValue({ failed: true, logged: 0 });
    renderWithTheme(<PostCallScreen />);
    expect(screen.getByText('Not answered')).toBeOnTheScreen();
    expect(await screen.findByText(/tries again by itself/)).toBeOnTheScreen();
    expect(screen.queryByTestId('post-call-note')).toBeNull();
    fireEvent.press(screen.getByTestId('post-call-done'));
    expect(usePostCallStore.getState().pending).toBeNull();
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('never says saved for a call the sync skipped, even though the sync itself worked', async () => {
    usePostCallStore.setState({ pending: ended });
    // An earlier call with the same number was logged — but not this one.
    loggedNow('9811000001', ended.startedAt - 60 * 60 * 1000);
    (syncDeviceCalls as jest.Mock).mockResolvedValue({ failed: false, logged: 0 });
    renderWithTheme(<PostCallScreen />);
    expect(
      await screen.findByText('Not saved: this number is not on a CRM lead.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Call saved to the CRM')).toBeNull();
  });

  it('says saved when an earlier background run already logged this call', async () => {
    usePostCallStore.setState({ pending: ended });
    loggedNow('9811000001', ended.startedAt + 3_000);
    (syncDeviceCalls as jest.Mock).mockResolvedValue({ failed: false, logged: 0 });
    renderWithTheme(<PostCallScreen />);
    expect(await screen.findByText('Call saved to the CRM')).toBeOnTheScreen();
  });

  it('points to Settings when call logging is switched off, without syncing', async () => {
    usePostCallStore.setState({ pending: ended });
    useFeaturesStore.setState({ autoLog: false });
    renderWithTheme(<PostCallScreen />);
    expect(await screen.findByText(/Call logging is off/)).toBeOnTheScreen();
    expect(syncDeviceCalls).not.toHaveBeenCalled();
  });
});
