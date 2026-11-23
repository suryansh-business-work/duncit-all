import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ManualLogsTab from '@/components/ManualLogsTab';
import { DELETE_CRM_MANUAL_LOG, UPDATE_CRM_MANUAL_LOG, VENUE_LEAD } from '@/api/crm.gql';
import { CRM_USERS_BY_IDS } from '@/api/crmUsers.gql';
import type { CrmActivity } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { venueLead } from '../fixtures/leads';

// The Tiptap editor has its own suite; this double hands back (html, text) like the real one.
vi.mock('@duncit/rich-text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/rich-text')>()),
  DuncitRichTextInput: ({
    value,
    onChange,
    readOnly,
  }: Readonly<{ value: string; onChange: (html: string, text: string) => void; readOnly?: boolean }>) =>
    readOnly ? (
      <div data-testid="note-body">{value}</div>
    ) : (
      <textarea aria-label="Log body" value={value} onChange={(e) => onChange(`<p>${e.target.value}</p>`, e.target.value)} />
    ),
}));

/**
 * What the team does with a log after writing it: edit it, delete it (it stays
 * as a "deleted" placeholder), read who did what in the log activity, and open
 * a teammate's details from their name.
 */

const log = (over: Partial<CrmActivity>): CrmActivity => ({
  id: 'log-1',
  type: 'NOTE',
  summary: 'Owner call',
  body_html: '<p>Agreed on rates</p>',
  body_text: 'Agreed on rates',
  created_by: 'u-asha',
  created_at: '2026-11-20T10:00:00.000Z',
  is_deleted: false,
  can_change: true,
  ...over,
});

const people: MockedResponse = {
  request: { query: CRM_USERS_BY_IDS, variables: { ids: ['u-asha', 'u-old'] } },
  result: {
    data: {
      crmUsersByIds: [
        { id: 'u-asha', name: 'Asha Rao', email: 'asha@duncit.test', roles: ['CRM_MANAGER'], is_staff: true },
        { id: 'u-old', name: 'Old Hand', email: null, roles: [], is_staff: false },
      ],
    },
  },
  maxUsageCount: 5,
};

const leadRefetch: MockedResponse = {
  request: { query: VENUE_LEAD, variables: { id: 'venue-1' } },
  result: { data: { venueLead: { ...venueLead(), matched_user: null } } },
  maxUsageCount: 3,
};

const renderTab = (activities: CrmActivity[], mocks: MockedResponse[] = []) =>
  renderWithApollo(<ManualLogsTab entityType="VENUE_LEAD" entityId="venue-1" activities={activities} />, [people, ...mocks]);

describe('ManualLogsTab · edit and delete', () => {
  it('offers edit and delete only on logs the server says this user may change', () => {
    renderTab([log({}), log({ id: 'log-2', summary: 'Someone else', created_by: 'u-old', can_change: false })]);

    const [mine, theirs] = screen.getAllByTestId('manual-log-card');
    expect(within(mine).getByRole('button', { name: 'Edit Owner call' })).toBeInTheDocument();
    expect(within(mine).getByRole('button', { name: 'Delete Owner call' })).toBeInTheDocument();
    expect(within(theirs).queryByTestId('manual-log-edit')).toBeNull();
    expect(within(theirs).queryByTestId('manual-log-delete')).toBeNull();
  });

  it('edits a log in place and saves it under its id', async () => {
    const update: MockedResponse = {
      request: {
        query: UPDATE_CRM_MANUAL_LOG,
        variables: { input: { entity_type: 'VENUE_LEAD', entity_id: 'venue-1', log_id: 'log-1', summary: 'Owner call v2', body_html: '<p>New rates</p>', body_text: 'New rates' } },
      },
      result: vi.fn(() => ({ data: { updateCrmManualLog: log({ summary: 'Owner call v2' }) } })),
    };
    renderTab([log({})], [update, leadRefetch]);

    fireEvent.click(screen.getByTestId('manual-log-edit'));
    expect(screen.getByText('Edit manual log')).toBeInTheDocument();
    expect(screen.getByTestId('manual-log-title')).toHaveValue('Owner call');
    fireEvent.change(screen.getByTestId('manual-log-title'), { target: { value: 'Owner call v2' } });
    fireEvent.change(screen.getByLabelText('Log body'), { target: { value: 'New rates' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(update.result).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Edit manual log')).toBeNull());
  });

  it('asks before deleting, then deletes the log by its id', async () => {
    const remove: MockedResponse = {
      request: { query: DELETE_CRM_MANUAL_LOG, variables: { entity_type: 'VENUE_LEAD', entity_id: 'venue-1', log_id: 'log-1' } },
      result: vi.fn(() => ({ data: { deleteCrmManualLog: log({ is_deleted: true, summary: '', can_change: false }) } })),
    };
    renderTab([log({})], [remove, leadRefetch]);

    fireEvent.click(screen.getByTestId('manual-log-delete'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this log?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(remove.result).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('explains a refused delete', async () => {
    const remove: MockedResponse = {
      request: { query: DELETE_CRM_MANUAL_LOG, variables: { entity_type: 'VENUE_LEAD', entity_id: 'venue-1', log_id: 'log-1' } },
      error: new Error('Only the person who wrote this log can change it.'),
    };
    renderTab([log({})], [remove]);

    fireEvent.click(screen.getByTestId('manual-log-delete'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByTestId('manual-log-error')).toHaveTextContent('Only the person who wrote this log can change it.');
  });
});

describe('ManualLogsTab · history and people', () => {
  it('keeps a deleted log as a placeholder and marks an edited one', async () => {
    renderTab([
      log({ id: 'log-9', is_deleted: true, summary: '', body_html: '', deleted_by: 'u-asha', deleted_at: '2026-11-21T09:00:00.000Z', can_change: false }),
      log({ created_by: 'u-old', updated_at: '2026-11-20T12:00:00.000Z' }),
    ]);

    const placeholder = screen.getByTestId('manual-log-deleted');
    expect(placeholder).toHaveTextContent('This log was deleted');
    expect(await within(placeholder).findByRole('button', { name: 'Open details for Asha Rao' })).toBeInTheDocument();
    expect(within(placeholder).queryByTestId('note-body')).toBeNull();
    expect(screen.getByTestId('manual-log-card')).toHaveTextContent(/Edited /);
  });

  it('lists the Created, Updated and Deleted activity, newest first', async () => {
    renderTab([
      log({}),
      { type: 'NOTE_CREATED', target: 'log-1', created_by: 'u-asha', created_at: '2026-11-20T10:00:00.000Z' },
      { type: 'NOTE_UPDATED', target: 'log-1', created_by: 'u-asha', created_at: '2026-11-20T11:00:00.000Z' },
      { type: 'NOTE_DELETED', target: 'log-1', created_by: 'u-old', created_at: '2026-11-20T12:00:00.000Z' },
    ]);

    const history = screen.getByTestId('manual-log-history');
    const rows = within(history).getAllByRole('listitem');
    expect(rows.map((row) => within(row).getAllByText(/Created|Updated|Deleted/)[0].textContent)).toEqual(['Deleted', 'Updated', 'Created']);
    expect(await within(rows[0]).findByRole('button', { name: 'Open details for Old Hand' })).toBeInTheDocument();
  });

  it("opens a teammate's details from their name, and hides a former member's contact", async () => {
    renderTab([log({}), log({ id: 'log-2', created_by: 'u-old', can_change: false })]);

    fireEvent.click(await screen.findByRole('button', { name: 'Open details for Asha Rao' }));
    const dialog = await screen.findByRole('dialog', { name: 'Asha Rao' });
    expect(dialog).toHaveTextContent('asha@duncit.test');
    expect(within(dialog).getByText('CRM_MANAGER')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Open details for Old Hand' }));
    const former = await screen.findByRole('dialog', { name: 'Old Hand' });
    expect(former).toHaveTextContent('no longer on the CRM team');
    expect(former).not.toHaveTextContent('@duncit.test');
  });

  it('names an author it cannot look up as an unknown user', async () => {
    renderTab([log({ created_by: 'u-ghost' })], [
      { request: { query: CRM_USERS_BY_IDS, variables: { ids: ['u-ghost'] } }, result: { data: { crmUsersByIds: [] } } },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Open details for Unknown user' }));
    expect(await screen.findByRole('dialog', { name: 'Unknown user' })).toBeInTheDocument();
  });
});
