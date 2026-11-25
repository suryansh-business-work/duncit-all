import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { formatDate } from '@duncit/datetime';

import {
  CrmAppCreateReminderDocument,
  CrmAppRemindersDocument,
  CrmAppToggleReminderDocument,
} from '@/graphql/reminders';
import * as extra from '@/graphql/remindersExtra';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { AddReminderScreen } from '../reminders/AddReminderScreen';
import { RemindersScreen } from '../reminders/RemindersScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** CRM › Reminders: the portal's calendar on the phone — views, filters, follow-ups and each event's sheet. */

const request = gqlRequest as jest.Mock;
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000);
const REMINDER = {
  id: 'r1',
  entity_type: 'VENUE_LEAD',
  lead_id: 'v1',
  title: 'Call Grand Hall back',
  due_at: inHours(3).toISOString(),
  notes: 'Ask about Sunday slots',
  status: 'PENDING',
};
const GENERAL = {
  ...REMINDER,
  id: 'r2',
  entity_type: 'GENERAL',
  lead_id: null,
  title: 'Team review',
  notes: null,
  due_at: inHours(4).toISOString(),
};
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === CrmAppRemindersDocument) return { crmReminders: [REMINDER, GENERAL] };
    if (doc === extra.CrmAppCalendarFollowUpsDocument)
      return {
        venueLeads: [{ id: 'v1', venue_name: 'Grand Hall', next_follow_up_date: null }],
        hostLeads: [
          { id: 'h1', host_name: 'Pune Runners', next_follow_up_date: inHours(5).toISOString() },
        ],
      };
    if (doc === CrmAppToggleReminderDocument)
      return { toggleCrmReminderDone: { id: 'r1', status: 'DONE' } };
    if (doc === extra.CrmAppDeleteReminderDocument) return { deleteCrmReminder: true };
    if (doc === extra.CrmAppUpdateReminderDocument) return { updateCrmReminder: { id: 'r1' } };
    if (doc === CrmAppCreateReminderDocument) return { createCrmReminder: { id: 'r9' } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const pick = (...dates: Date[]) => {
  for (const date of dates)
    (DateTimePickerAndroid.open as jest.Mock).mockImplementationOnce(({ onChange }) =>
      onChange({ type: 'set' }, date),
    );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RemindersScreen › calendar', () => {
  it('lists reminders and lead follow-ups by day, and opens a follow-up’s lead', async () => {
    serve();
    renderWithTheme(<RemindersScreen />);
    expect(await screen.findByText('Call Grand Hall back')).toBeOnTheScreen();
    expect(screen.getByText('Team review')).toBeOnTheScreen();
    expect(screen.getByText('Follow-up · Pune Runners')).toBeOnTheScreen();
    expect(screen.getByTestId('calendar-title')).toHaveTextContent('Upcoming');
    fireEvent.press(screen.getByText('Follow-up · Pune Runners'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'HOST_LEAD', id: 'h1' });
  });

  it('filters by type on the phone and by status on the server', async () => {
    serve();
    renderWithTheme(<RemindersScreen />);
    await screen.findByText('Call Grand Hall back');
    fireEvent.press(screen.getByTestId('calendar-type-HOST_LEAD'));
    expect(screen.queryByText('Call Grand Hall back')).toBeNull();
    expect(screen.getByText('Follow-up · Pune Runners')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('calendar-type-ALL'));
    fireEvent.press(screen.getByTestId('calendar-status-DONE'));
    await waitFor(() =>
      expect(callsTo(CrmAppRemindersDocument).at(-1)?.[1]).toEqual({ filter: { status: 'DONE' } }),
    );
    expect(screen.queryByText('Follow-up · Pune Runners')).toBeNull();
  });

  it('moves through day, week, month and year views', async () => {
    serve();
    renderWithTheme(<RemindersScreen />);
    await screen.findByText('Call Grand Hall back');
    fireEvent.press(screen.getByTestId('calendar-view-month'));
    expect(screen.getByTestId('calendar-title')).toHaveTextContent(format(new Date(), 'MMMM yyyy'));
    expect(screen.getByTestId('calendar-month')).toBeOnTheScreen();
    const due = new Date(REMINDER.due_at);
    // Late on a month's last day the reminder (three hours on) falls in the next month.
    if (format(due, 'yyyy-MM') !== format(new Date(), 'yyyy-MM'))
      fireEvent.press(screen.getByTestId('calendar-next'));
    fireEvent.press(screen.getByTestId(`calendar-day-${format(due, 'yyyy-MM-dd')}`));
    expect(screen.getByText('Call Grand Hall back')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('calendar-next'));
    expect(screen.queryByText('Call Grand Hall back')).toBeNull();
    fireEvent.press(screen.getByTestId('calendar-previous'));
    fireEvent.press(screen.getByTestId('calendar-today'));
    fireEvent.press(screen.getByTestId('calendar-view-year'));
    expect(screen.getByTestId('calendar-title')).toHaveTextContent(format(new Date(), 'yyyy'));
    fireEvent.press(screen.getByTestId('calendar-view-week'));
    expect(screen.getByTestId('calendar-title')).toHaveTextContent(
      `${formatDate(startOfWeek(new Date()))} – ${formatDate(endOfWeek(new Date()))}`,
    );
    fireEvent.press(screen.getByTestId('calendar-view-day'));
    fireEvent.press(screen.getByTestId('calendar-next'));
    fireEvent.press(screen.getByTestId('calendar-next'));
    expect(await screen.findByText('Nothing scheduled in this range.')).toBeOnTheScreen();
  });

  it('shows a failed read with a retry, and a failed follow-up read beside the reminders', async () => {
    let fail = true;
    serve(
      new Map<unknown, Handler>([
        [
          CrmAppRemindersDocument,
          () => {
            if (fail) throw new Error('Reminders are down');
            return { crmReminders: [REMINDER] };
          },
        ],
        [
          extra.CrmAppCalendarFollowUpsDocument,
          () => {
            throw new Error('Follow-ups are down');
          },
        ],
      ]),
    );
    renderWithTheme(<RemindersScreen />);
    expect(await screen.findByText('Reminders are down')).toBeOnTheScreen();
    expect(screen.getByText('Follow-ups are down')).toBeOnTheScreen();
    fail = false;
    await act(async () => fireEvent.press(screen.getByTestId('state-retry')));
    expect(await screen.findByText('Call Grand Hall back')).toBeOnTheScreen();
  });
});

describe('RemindersScreen › event sheet', () => {
  it('shows a reminder’s details and marks it done', async () => {
    serve();
    renderWithTheme(<RemindersScreen />);
    fireEvent.press(await screen.findByTestId('reminder-details-r1'));
    expect(screen.getByText('Reminder')).toBeOnTheScreen();
    expect(screen.getByText('Grand Hall')).toBeOnTheScreen();
    expect(screen.getByText('Ask about Sunday slots')).toBeOnTheScreen();
    expect(screen.getByText('Venue lead')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('event-toggle')));
    expect(request).toHaveBeenCalledWith(CrmAppToggleReminderDocument, { id: 'r1' });
    expect(screen.queryByTestId('event-sheet')).toBeNull();
  });

  it('opens the lead from the sheet, and names a general reminder as not linked', async () => {
    serve();
    renderWithTheme(<RemindersScreen />);
    fireEvent.press(await screen.findByTestId('reminder-details-r1'));
    fireEvent.press(screen.getByTestId('event-open-lead'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'VENUE_LEAD', id: 'v1' });
    fireEvent.press(screen.getByTestId('reminder-details-r2'));
    expect(screen.getByText('General reminder (not linked to a lead)')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-open-lead')).toBeNull();
    fireEvent.press(screen.getByTestId('event-sheet-close'));
    fireEvent.press(screen.getByTestId('followup-details-f-HOST_LEAD-h1'));
    expect(screen.getByText('Follow-up')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-toggle')).toBeNull();
  });

  it('edits a reminder to any date and time, and keeps a failed save on the form', async () => {
    let fail = true;
    serve(
      new Map<unknown, Handler>([
        [
          extra.CrmAppUpdateReminderDocument,
          () => {
            if (fail) throw new Error('Could not update');
            return { updateCrmReminder: { id: 'r1' } };
          },
        ],
      ]),
    );
    renderWithTheme(<RemindersScreen />);
    fireEvent.press(await screen.findByTestId('reminder-details-r1'));
    fireEvent.press(screen.getByTestId('event-edit'));
    expect(screen.getByText('Edit reminder')).toBeOnTheScreen();
    pick(new Date(2026, 11, 3), new Date(2026, 11, 3, 16, 45));
    await act(async () => fireEvent.press(screen.getByTestId('reminder-due-at')));
    fireEvent.changeText(screen.getByTestId('reminder-title'), 'Call Grand Hall at 5');
    await act(async () => fireEvent.press(screen.getByTestId('reminder-save')));
    expect(screen.getByText('Could not update')).toBeOnTheScreen();
    fail = false;
    await act(async () => fireEvent.press(screen.getByTestId('reminder-save')));
    expect(callsTo(extra.CrmAppUpdateReminderDocument).at(-1)?.[1]).toEqual({
      id: 'r1',
      input: {
        title: 'Call Grand Hall at 5',
        due_at: new Date(2026, 11, 3, 16, 45).toISOString(),
        notes: 'Ask about Sunday slots',
      },
    });
    expect(screen.queryByTestId('event-sheet')).toBeNull();
  });

  it('deletes a reminder after a confirm', async () => {
    serve();
    renderWithTheme(<RemindersScreen />);
    fireEvent.press(await screen.findByTestId('reminder-details-r1'));
    fireEvent.press(screen.getByTestId('event-delete'));
    expect(screen.getByText('Delete "Call Grand Hall back"?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('event-delete-dialog-cancel'));
    fireEvent.press(screen.getByTestId('event-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('event-delete-dialog-confirm')));
    expect(request).toHaveBeenCalledWith(extra.CrmAppDeleteReminderDocument, { id: 'r1' });
    expect(screen.queryByTestId('event-sheet')).toBeNull();
  });
});

describe('AddReminderScreen › exact time', () => {
  it('saves a reminder due at the picked date and time', async () => {
    serve();
    renderWithTheme(<AddReminderScreen />);
    fireEvent.changeText(screen.getByTestId('reminder-title'), 'Site visit');
    pick(new Date(2026, 11, 10), new Date(2026, 11, 10, 11, 15));
    await act(async () => fireEvent.press(screen.getByTestId('reminder-due-at')));
    await act(async () => fireEvent.press(screen.getByTestId('reminder-save')));
    expect(callsTo(CrmAppCreateReminderDocument)[0]?.[1].input).toMatchObject({
      entity_type: 'GENERAL',
      title: 'Site visit',
      due_at: new Date(2026, 11, 10, 11, 15).toISOString(),
    });
  });
});
