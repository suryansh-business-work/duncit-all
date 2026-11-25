import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { gqlRequest } from '@/services/graphql.client';
import { syncDeviceCalls } from '@/services/call-sync';
import { readPermissions } from '@/services/permissions';
import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { usePostCallStore } from '@/stores/postCall.store';
import { HomeScreen } from '../home/HomeScreen';
import { RemindersScreen } from '../reminders/RemindersScreen';
import { PostCallScreen } from '../post-call/PostCallScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/call-sync', () => ({ syncDeviceCalls: jest.fn() }));
jest.mock('@/services/permissions', () => ({ readPermissions: jest.fn() }));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  setOptions: jest.fn(),
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

  it('saves the call and offers a note, a reminder and the lead', async () => {
    usePostCallStore.setState({ pending: ended });
    (syncDeviceCalls as jest.Mock).mockResolvedValue({ failed: false });
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
    (syncDeviceCalls as jest.Mock).mockResolvedValue({ failed: true });
    renderWithTheme(<PostCallScreen />);
    expect(screen.getByText('Not answered')).toBeOnTheScreen();
    expect(await screen.findByText(/Sync failed/)).toBeOnTheScreen();
    expect(screen.queryByTestId('post-call-note')).toBeNull();
    fireEvent.press(screen.getByTestId('post-call-done'));
    expect(usePostCallStore.getState().pending).toBeNull();
    expect(mockNav.goBack).toHaveBeenCalled();
  });
});
