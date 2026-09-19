import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import RemindersTab from '@/components/reminders-tab';
import ReminderFormDialog from '@/components/reminders-tab/ReminderFormDialog';
import {
  CREATE_CRM_REMINDER,
  CRM_REMINDERS,
  DELETE_CRM_REMINDER,
  TOGGLE_CRM_REMINDER,
  UPDATE_CRM_REMINDER,
  type CrmReminder,
} from '@/api/reminders.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

vi.mock('@mui/x-date-pickers/DateTimePicker', async () => ({
  DateTimePicker: (await import('../helpers/pickerStub')).PickerStub,
}));

const LEAD = 'venue-42';
const listVars = { filter: { entity_type: 'VENUE_LEAD', lead_id: LEAD } };
const DUE = '2026-09-20T10:30:00.000Z';

const reminder = (overrides: Partial<CrmReminder>): CrmReminder => ({
  id: 'rem-1',
  entity_type: 'VENUE_LEAD',
  lead_id: LEAD,
  title: 'Call back about the rooftop',
  due_at: DUE,
  notes: null,
  status: 'PENDING',
  assigned_to: null,
  ...overrides,
});

const pending = reminder({ id: 'rem-1', notes: 'Ask for the weekend rate' });
const done = reminder({ id: 'rem-2', title: 'Send the rate card', status: 'DONE' });

const listMock = (items: CrmReminder[]): MockedResponse => ({
  request: { query: CRM_REMINDERS, variables: listVars },
  result: { data: { crmReminders: items } },
  maxUsageCount: 10,
});

const renderTab = (mocks: MockedResponse[]) => renderWithApollo(<RemindersTab entity="VENUE_LEAD" leadId={LEAD} />, mocks);

describe('RemindersTab', () => {
  it('says when a lead has no reminders', async () => {
    renderTab([listMock([])]);
    expect(await screen.findByText('No reminders yet.')).toBeInTheDocument();
  });

  it('shows the list error', async () => {
    renderTab([{ request: { query: CRM_REMINDERS, variables: listVars }, error: new Error('Reminders are unavailable') }]);
    expect(await screen.findByText('Reminders are unavailable')).toBeInTheDocument();
  });

  it('lists pending and done reminders with their due time and notes', async () => {
    renderTab([listMock([pending, done])]);

    expect(await screen.findByText('Call back about the rooftop')).toBeInTheDocument();
    expect(screen.getByText(`${formatDateTime(DUE)} · Ask for the weekend rate`)).toBeInTheDocument();
    expect(screen.getByText('Send the rate card')).toHaveStyle({ textDecoration: 'line-through' });
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark pending' })).toBeInTheDocument();
  });

  it('toggles a reminder done', async () => {
    const toggle = vi.fn(() => ({ data: { toggleCrmReminderDone: { ...pending, status: 'DONE' } } }));
    renderTab([listMock([pending]), { request: { query: TOGGLE_CRM_REMINDER, variables: { id: 'rem-1' } }, result: toggle }]);

    fireEvent.click(await screen.findByRole('button', { name: 'Mark done' }));

    await waitFor(() => expect(toggle).toHaveBeenCalled());
  });

  it('edits a reminder in the form dialog', async () => {
    const update = vi.fn(() => ({ data: { updateCrmReminder: { ...pending, title: 'Call back about the terrace' } } }));
    renderTab([
      listMock([pending]),
      {
        request: {
          query: UPDATE_CRM_REMINDER,
          variables: { id: 'rem-1', input: { title: 'Call back about the terrace', due_at: DUE, notes: 'Ask for the weekend rate' } },
        },
        result: update,
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit reminder' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit reminder' }));
    expect(dialog.getByLabelText(/Title/)).toHaveValue('Call back about the rooftop');
    expect(dialog.getByLabelText('Due date & time')).toHaveValue(DUE);

    fireEvent.change(dialog.getByLabelText(/Title/), { target: { value: '  Call back about the terrace ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens a blank form for a new reminder and closes it on Cancel', async () => {
    renderTab([listMock([])]);
    await screen.findByText('No reminders yet.');

    fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New reminder' }));
    expect(dialog.getByLabelText(/Title/)).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('deletes a reminder after confirmation, and can back out', async () => {
    const remove = vi.fn(() => ({ data: { deleteCrmReminder: true } }));
    renderTab([listMock([pending]), { request: { query: DELETE_CRM_REMINDER, variables: { id: 'rem-1' } }, result: remove }]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete reminder' }));
    expect(await screen.findByText('Delete "Call back about the rooftop"?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByText('Delete "Call back about the rooftop"?')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Delete reminder' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });
});

describe('ReminderFormDialog', () => {
  const renderDialog = (mocks: MockedResponse[] = []) => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderWithApollo(
      <ReminderFormDialog open entity="GENERAL" reminder={null} onClose={onClose} onSaved={onSaved} />,
      mocks,
    );
    return { onSaved, onClose };
  };

  it('insists on a valid due date and time', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Review venue list' } });

    fireEvent.change(screen.getByLabelText('Due date & time'), { target: { value: 'next friday-ish' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Pick a valid due date & time.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Due date & time'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Pick a valid due date & time.')).toBeInTheDocument();
  });

  it('creates a general reminder with no lead attached', async () => {
    const create = vi.fn(() => ({ data: { createCrmReminder: reminder({ id: 'rem-9', entity_type: 'GENERAL', lead_id: null }) } }));
    const { onSaved } = renderDialog([
      {
        request: {
          query: CREATE_CRM_REMINDER,
          variables: { input: { entity_type: 'GENERAL', lead_id: null, title: 'Review venue list', due_at: DUE, notes: 'Weekly' } },
        },
        result: create,
      },
    ]);

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Review venue list' } });
    fireEvent.change(screen.getByLabelText('Due date & time'), { target: { value: DUE } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Weekly' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalled();
  });

  it('shows why a save failed and keeps the dialog open', async () => {
    const { onSaved } = renderDialog([
      {
        request: {
          query: CREATE_CRM_REMINDER,
          variables: { input: { entity_type: 'GENERAL', lead_id: null, title: 'Review venue list', due_at: DUE, notes: '' } },
        },
        error: new Error('Due date is in the past'),
      },
    ]);

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Review venue list' } });
    fireEvent.change(screen.getByLabelText('Due date & time'), { target: { value: DUE } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Due date is in the past')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('cannot be dismissed while saving', async () => {
    const { onClose } = renderDialog([
      {
        request: {
          query: CREATE_CRM_REMINDER,
          variables: { input: { entity_type: 'GENERAL', lead_id: null, title: 'Review venue list', due_at: DUE, notes: '' } },
        },
        delay: Infinity,
      },
    ]);

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Review venue list' } });
    fireEvent.change(screen.getByLabelText('Due date & time'), { target: { value: DUE } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
