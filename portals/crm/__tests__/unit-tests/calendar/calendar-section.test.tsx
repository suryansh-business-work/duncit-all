import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { formatDate } from '@duncit/app-settings';
import CalendarSection from '@/components/calendar/CalendarSection';
import {
  CRM_REMINDERS,
  DELETE_CRM_REMINDER,
  TOGGLE_CRM_REMINDER,
  UPDATE_CRM_REMINDER,
  type CrmReminder,
} from '@/api/reminders.gql';
import { HOST_LEADS, VENUE_LEADS } from '@/api/crm.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { hostLead, venueLead } from '../fixtures/leads';

vi.mock('@mui/x-date-pickers/DateTimePicker', async () => ({
  DateTimePicker: (await import('../helpers/pickerStub')).PickerStub,
}));

const NOW = new Date('2026-09-15T09:00:00.000Z');

const reminder = (overrides: Partial<CrmReminder>): CrmReminder => ({
  id: 'rem',
  entity_type: 'VENUE_LEAD',
  lead_id: 'venue-1',
  title: 'Reminder',
  due_at: '2026-09-15T12:00:00.000Z',
  notes: null,
  status: 'PENDING',
  assigned_to: null,
  ...overrides,
});

const callBack = reminder({ id: 'rem-1', title: 'Call Grand Hall back', notes: 'Bring the rate card' });
const reviewList = reminder({ id: 'rem-2', entity_type: 'GENERAL', lead_id: null, title: 'Review venue list', due_at: '2026-09-14T12:00:00.000Z', status: 'DONE' });
const confirmRun = reminder({ id: 'rem-3', entity_type: 'HOST_LEAD', lead_id: 'host-1', title: 'Confirm Sunday run', due_at: '2026-09-16T12:00:00.000Z' });
const orphanVenue = reminder({ id: 'rem-4', lead_id: null, title: 'Chase unnamed venue', due_at: '2026-09-17T12:00:00.000Z' });
const unknownHost = reminder({ id: 'rem-5', entity_type: 'HOST_LEAD', lead_id: 'host-x', title: 'Ping archived host', due_at: '2026-09-17T13:00:00.000Z' });
const legacy = reminder({ id: 'rem-6', title: 'Legacy reminder', due_at: 'not-a-date' });

const ALL = [callBack, reviewList, confirmRun, orphanVenue, unknownHost, legacy];

const remindersMock = (filter: Record<string, unknown>, items: CrmReminder[]): MockedResponse => ({
  request: { query: CRM_REMINDERS, variables: { filter } },
  result: { data: { crmReminders: items } },
  maxUsageCount: 20,
});

const leadMocks: MockedResponse[] = [
  {
    request: { query: VENUE_LEADS, variables: { filter: {} } },
    result: {
      data: {
        venueLeads: [
          venueLead({ id: 'venue-1', next_follow_up_date: '2026-09-18T12:00:00.000Z' }),
          venueLead({ id: 'venue-2', venue_name: 'Lake View', next_follow_up_date: null }),
        ],
      },
    },
    maxUsageCount: 20,
  },
  {
    request: { query: HOST_LEADS, variables: { filter: {} } },
    result: {
      data: {
        hostLeads: [
          hostLead({ id: 'host-1', next_follow_up_date: '2026-09-19T12:00:00.000Z' }),
          hostLead({ id: 'host-2', host_name: 'Bike Club', next_follow_up_date: 'TBD' }),
        ],
      },
    },
    maxUsageCount: 20,
  },
];

const renderSection = (extra: MockedResponse[] = []) =>
  renderWithApollo(<CalendarSection />, [remindersMock({}, ALL), ...leadMocks, ...extra], { route: '/reminders' });

const title = () => screen.getByRole('status');
const pills = () => screen.getAllByTestId('crm-calendar-event-pill').map((p) => p.textContent ?? '');

const pickOption = async (field: RegExp, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: field }));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
};

const openPill = async (name: string) => {
  const pill = (await screen.findAllByTestId('crm-calendar-event-pill')).find((p) => p.textContent?.startsWith(name));
  fireEvent.click(pill as HTMLElement);
  return within(await screen.findByRole('dialog', { name }));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalendarSection', () => {
  it('lays out the month with reminders and follow-ups, skipping undated leads', async () => {
    renderSection();

    await screen.findByText('Call Grand Hall back');
    expect(title()).toHaveTextContent('September 2026');
    const shown = pills();
    for (const expected of ['Call Grand Hall back', 'Review venue list', 'Confirm Sunday run', 'Follow-up · Grand Hall', 'Follow-up · Pune Runners']) {
      expect(shown.some((text) => text.startsWith(expected))).toBe(true);
    }
    expect(shown.some((text) => text.includes('Legacy reminder'))).toBe(false);
    expect(shown.some((text) => text.includes('Lake View') || text.includes('Bike Club'))).toBe(false);
  });

  it('steps month by month and comes back to today', async () => {
    renderSection();
    await screen.findByText('Call Grand Hall back');

    fireEvent.click(screen.getByTestId('crm-calendar-next'));
    expect(title()).toHaveTextContent('October 2026');
    fireEvent.click(screen.getByTestId('crm-calendar-previous'));
    fireEvent.click(screen.getByTestId('crm-calendar-previous'));
    expect(title()).toHaveTextContent('August 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(title()).toHaveTextContent('September 2026');
  });

  it('switches between week, day, year and upcoming views', async () => {
    renderSection();
    await screen.findByText('Call Grand Hall back');

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(title()).toHaveTextContent(`${format(startOfWeek(NOW), 'dd MMM')} – ${format(endOfWeek(NOW), 'dd MMM yyyy')}`);
    expect(pills().some((text) => text.includes('Call Grand Hall back'))).toBe(true);
    fireEvent.click(screen.getByTestId('crm-calendar-next'));
    const nextWeek = addDays(NOW, 7);
    expect(title()).toHaveTextContent(`${format(startOfWeek(nextWeek), 'dd MMM')} – ${format(endOfWeek(nextWeek), 'dd MMM yyyy')}`);
    expect(screen.getByText('Nothing scheduled in this range.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(title()).toHaveTextContent(formatDate(NOW));
    fireEvent.click(screen.getByTestId('crm-calendar-next'));
    expect(title()).toHaveTextContent(formatDate(addDays(NOW, 1)));

    fireEvent.click(screen.getByRole('button', { name: 'Year' }));
    expect(title()).toHaveTextContent('2026');
    fireEvent.click(screen.getByTestId('crm-calendar-next'));
    expect(title()).toHaveTextContent('2027');

    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
    expect(title()).toHaveTextContent('Upcoming');
    expect(screen.queryByTestId('crm-calendar-next')).toBeNull();
    expect(pills().some((text) => text.includes('Follow-up · Pune Runners'))).toBe(true);

    // Pressing the selected view again keeps it.
    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
    expect(title()).toHaveTextContent('Upcoming');
  });

  it('filters by lead type and by reminder status', async () => {
    renderSection([
      remindersMock({ status: 'PENDING' }, [callBack, confirmRun]),
      remindersMock({ status: 'DONE' }, [reviewList]),
    ]);
    await screen.findByText('Call Grand Hall back');

    await pickOption(/^Type/, 'Venue');
    await waitFor(() => expect(pills().some((text) => text.includes('Confirm Sunday run'))).toBe(false));
    expect(pills().some((text) => text.includes('Follow-up · Grand Hall'))).toBe(true);
    expect(pills().some((text) => text.includes('Follow-up · Pune Runners'))).toBe(false);

    await pickOption(/^Type/, 'Host');
    await waitFor(() => expect(pills().some((text) => text.includes('Confirm Sunday run'))).toBe(true));

    await pickOption(/^Type/, 'All');
    await pickOption(/^Status/, 'Done');
    await waitFor(() => expect(pills().every((text) => !text.includes('Follow-up'))).toBe(true));
    expect(pills().some((text) => text.includes('Review venue list'))).toBe(true);

    await pickOption(/^Status/, 'Pending');
    await waitFor(() => expect(pills().some((text) => text.includes('Review venue list'))).toBe(false));
  });

  it('marks a reminder done from its drawer', async () => {
    const toggle = vi.fn(() => ({ data: { toggleCrmReminderDone: { ...callBack, status: 'DONE' } } }));
    renderSection([{ request: { query: TOGGLE_CRM_REMINDER, variables: { id: 'rem-1' } }, result: toggle }]);

    const drawer = await openPill('Call Grand Hall back');
    expect(drawer.getByText('Grand Hall')).toBeInTheDocument();
    fireEvent.click(drawer.getByRole('button', { name: 'Mark done' }));

    await waitFor(() => expect(toggle).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('deletes a reminder from its drawer', async () => {
    const remove = vi.fn(() => ({ data: { deleteCrmReminder: true } }));
    renderSection([{ request: { query: DELETE_CRM_REMINDER, variables: { id: 'rem-3' } }, result: remove }]);

    const drawer = await openPill('Confirm Sunday run');
    expect(drawer.getByText('Pune Runners')).toBeInTheDocument();
    fireEvent.click(drawer.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('edits a reminder from its drawer and saves it', async () => {
    const update = vi.fn(() => ({ data: { updateCrmReminder: callBack } }));
    renderSection([
      {
        request: {
          query: UPDATE_CRM_REMINDER,
          variables: { id: 'rem-1', input: { title: 'Call Grand Hall back', due_at: callBack.due_at, notes: 'Bring the rate card' } },
        },
        result: update,
      },
    ]);

    const drawer = await openPill('Call Grand Hall back');
    fireEvent.click(drawer.getByRole('button', { name: 'Edit' }));
    const form = within(await screen.findByRole('dialog', { name: 'Edit reminder' }));
    fireEvent.click(form.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit reminder' })).toBeNull());
  });

  it('opens a new general reminder and closes the drawer and form on request', async () => {
    renderSection();

    const drawer = await openPill('Review venue list');
    expect(drawer.getByText('General reminder (not linked to a lead)')).toBeInTheDocument();
    fireEvent.click(drawer.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const form = within(await screen.findByRole('dialog', { name: 'New reminder' }));
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('names reminders whose lead is missing or unknown with a dash', async () => {
    renderSection();

    const orphan = await openPill('Chase unnamed venue');
    expect(orphan.getByText('—')).toBeInTheDocument();
    fireEvent.click(orphan.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const archived = await openPill('Ping archived host');
    expect(archived.getByText('—')).toBeInTheDocument();
  });
});
