import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadDetailScreen } from '../lead/LeadDetailScreen';
import { AddNoteScreen } from '../lead/AddNoteScreen';
import { AddReminderScreen } from '../reminders/AddReminderScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  setOptions: jest.fn(),
};
let mockRouteParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

const request = gqlRequest as jest.Mock;

const venue = {
  id: 'v1',
  name: 'Smash Arena',
  city: 'Pune',
  lead_status: 'Contacted',
  priority: 'High',
  assigned_to: 'Asha',
  next_follow_up_date: null,
  contacts: [
    {
      name: 'Rohit',
      role: 'Owner',
      mobile_number: '9811000001',
      whatsapp_number: null,
      email: 'rohit@cafe.in',
    },
  ],
  activity_log: [
    {
      id: 'n1',
      type: 'NOTE',
      summary: 'Visited',
      body_text: 'Liked the turf',
      created_at: '2026-11-20T10:00:00.000Z',
      is_deleted: false,
    },
  ],
};

const commLog = {
  id: 'c1',
  type: 'CALL',
  direction: 'INBOUND',
  status: 'COMPLETED',
  subject: '',
  contact_name: 'Rohit',
  contact_value: '9811000001',
  duration_seconds: 134,
  recording_url: '',
  transcript: 'Agent: Hello',
  transcript_status: 'READY',
  summary: {
    status: 'READY',
    text: 'Wants Sunday slots',
    key_points: ['Budget 5k'],
    follow_ups: [],
  },
  created_at: '2026-11-24T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { kind: 'VENUE_LEAD', id: 'v1' };
});

describe('LeadDetailScreen', () => {
  it('shows the lead, its contacts and notes, and titles the screen with its name', async () => {
    request.mockResolvedValue({ venue });
    renderWithTheme(<LeadDetailScreen />);
    expect(await screen.findByText('Rohit')).toBeOnTheScreen();
    expect(screen.getByText('Contacted')).toBeOnTheScreen();
    expect(screen.getByText('Liked the turf')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Smash Arena' });
    expect(request.mock.calls[0][1]).toMatchObject({ id: 'v1', venue: true, host: false });
  });

  it('opens the call screen for a contact, with the lead it belongs to', async () => {
    request.mockResolvedValue({ venue });
    renderWithTheme(<LeadDetailScreen />);
    fireEvent.press(await screen.findByTestId('contact-call-0'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Call', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      to: '9811000001',
      leadName: 'Smash Arena',
      contactName: 'Rohit',
    });
  });

  it('opens Add note and Add reminder for this lead', async () => {
    request.mockResolvedValue({ venue });
    renderWithTheme(<LeadDetailScreen />);
    fireEvent.press(await screen.findByTestId('lead-add-note'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddNote', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
    });
    fireEvent.press(screen.getByTestId('lead-add-reminder'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddReminder', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
    });
  });

  it('shows calls with their AI summary and transcript on the Activity tab', async () => {
    request.mockImplementation(async (_doc: unknown, vars: { filter?: unknown }) =>
      vars.filter ? { communicationLogs: { total: 1, items: [commLog] } } : { venue },
    );
    renderWithTheme(<LeadDetailScreen />);
    fireEvent.press(await screen.findByTestId('lead-tab-activity'));
    expect(await screen.findByText('Incoming call')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Incoming call'));
    expect(screen.getByText('Wants Sunday slots')).toBeOnTheScreen();
    expect(screen.getByText('Budget 5k')).toBeOnTheScreen();
    expect(screen.getByText('Agent: Hello')).toBeOnTheScreen();
  });

  it('says not found for a link with a kind the CRM does not have', () => {
    mockRouteParams = { kind: 'USER_LEAD', id: 'x' };
    renderWithTheme(<LeadDetailScreen />);
    expect(screen.getByText('This lead was not found.')).toBeOnTheScreen();
  });

  it('offers a retry when the lead cannot be loaded', async () => {
    request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ venue });
    renderWithTheme(<LeadDetailScreen />);
    fireEvent.press(await screen.findByTestId('state-retry'));
    expect(await screen.findByText('Rohit')).toBeOnTheScreen();
  });
});

describe('AddNoteScreen', () => {
  it('saves the note as the portal’s manual log, escaped, and goes back', async () => {
    mockRouteParams = { kind: 'HOST_LEAD', id: 'h1', name: 'Run Club' };
    request.mockResolvedValue({ addCrmManualLog: { id: 'n9' } });
    renderWithTheme(<AddNoteScreen />);
    fireEvent.changeText(screen.getByTestId('note-body'), 'Call <later>');
    fireEvent.press(screen.getByTestId('note-save'));
    await waitFor(() => expect(mockNav.goBack).toHaveBeenCalled());
    expect(request.mock.calls[0][1]).toEqual({
      input: {
        entity_type: 'HOST_LEAD',
        entity_id: 'h1',
        summary: null,
        body_html: '<p>Call &lt;later&gt;</p>',
        body_text: 'Call <later>',
      },
    });
  });

  it('stays on the form with the reason when saving fails', async () => {
    mockRouteParams = { kind: 'HOST_LEAD', id: 'h1', name: 'Run Club' };
    request.mockRejectedValue(new Error('Access Denied'));
    renderWithTheme(<AddNoteScreen />);
    fireEvent.changeText(screen.getByTestId('note-body'), 'x');
    fireEvent.press(screen.getByTestId('note-save'));
    expect(await screen.findByText('Access Denied')).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });
});

describe('AddReminderScreen', () => {
  it('creates a reminder on the lead, due at the chosen time', async () => {
    mockRouteParams = {
      kind: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
      title: 'Call with Smash Arena',
    };
    request.mockResolvedValue({ createCrmReminder: { id: 'r1' } });
    renderWithTheme(<AddReminderScreen />);
    fireEvent.press(screen.getByTestId('reminder-due-hour'));
    const before = Date.now();
    fireEvent.press(screen.getByTestId('reminder-save'));
    await waitFor(() => expect(mockNav.goBack).toHaveBeenCalled());
    const input = request.mock.calls[0][1].input;
    expect(input).toMatchObject({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
      title: 'Call with Smash Arena',
      notes: null,
    });
    expect(new Date(input.due_at).getTime() - before).toBeGreaterThanOrEqual(59 * 60 * 1000);
  });

  it('makes a general reminder when opened without a lead', async () => {
    mockRouteParams = {};
    request.mockResolvedValue({ createCrmReminder: { id: 'r2' } });
    renderWithTheme(<AddReminderScreen />);
    fireEvent.changeText(screen.getByTestId('reminder-title'), 'Team review');
    fireEvent.press(screen.getByTestId('reminder-save'));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][1].input).toMatchObject({
      entity_type: 'GENERAL',
      lead_id: null,
      title: 'Team review',
    });
  });
});
