import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ManualLogsTab from '@/components/ManualLogsTab';
import { formatLogTimestamp, groupLogs, logKey } from '@/components/ManualLogsTab/logUtils';
import { ADD_CRM_MANUAL_LOG, VENUE_LEAD } from '@/api/crm.gql';
import type { CrmActivity } from '@/api/crm.types';
import { formatDateTime } from '@duncit/app-settings';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { venueLead } from '../fixtures/leads';

// The Tiptap editor has its own suite; this double hands back (html, text) the
// way the real one does, and shows read-only notes as their stored HTML.
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
      <textarea
        aria-label="Log body"
        value={value}
        onChange={(e) => onChange(e.target.value ? `<p>${e.target.value}</p>` : '', e.target.value)}
      />
    ),
}));

const NOW = new Date('2026-09-15T12:00:00.000Z');

const note = (overrides: Partial<CrmActivity>): CrmActivity => ({
  type: 'NOTE',
  summary: null,
  status: null,
  target: null,
  body_html: null,
  body_text: null,
  created_by: null,
  created_at: null,
  ...overrides,
});

const logInput = {
  entity_type: 'VENUE_LEAD',
  entity_id: 'venue-1',
  summary: 'Site visit',
  body_html: '<p>Met the owner</p>',
  body_text: 'Met the owner',
};

const addMock = (outcome: { error?: Error; delay?: number }): MockedResponse => ({
  request: { query: ADD_CRM_MANUAL_LOG, variables: { input: logInput } },
  ...(outcome.error
    ? { error: outcome.error }
    : { result: { data: { addCrmManualLog: note({ summary: 'Site visit', body_html: '<p>Met the owner</p>' }) } } }),
  delay: outcome.delay ?? 0,
});

const leadRefetch: MockedResponse = {
  request: { query: VENUE_LEAD, variables: { id: 'venue-1' } },
  result: { data: { venueLead: { ...venueLead(), matched_user: null } } },
  maxUsageCount: 3,
};

const renderTab = (mocks: MockedResponse[] = [], activities: CrmActivity[] = []) =>
  renderWithApollo(<ManualLogsTab entityType="VENUE_LEAD" entityId="venue-1" activities={activities} />, mocks);

const writeLog = () => {
  fireEvent.click(screen.getByTestId('manual-log-add'));
  fireEvent.change(screen.getByTestId('manual-log-title'), { target: { value: '  Site visit ' } });
  fireEvent.change(screen.getByLabelText('Log body'), { target: { value: 'Met the owner' } });
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ManualLogsTab composer', () => {
  it('only allows saving once the note has a body', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('manual-log-add'));
    expect(screen.queryByTestId('manual-log-add')).toBeNull();
    expect(screen.getByText('New manual log')).toBeInTheDocument();
    expect(screen.getByTestId('manual-log-save')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Log body'), { target: { value: 'Met the owner' } });
    expect(screen.getByTestId('manual-log-save')).toBeEnabled();
  });

  it('saves the note with a trimmed title, then closes and clears the composer', async () => {
    const withResult = { ...addMock({}), result: vi.fn(() => ({ data: { addCrmManualLog: note({ summary: 'Site visit', body_html: '<p>Met the owner</p>' }) } })) };
    renderTab([withResult, leadRefetch]);

    writeLog();
    fireEvent.click(screen.getByTestId('manual-log-save'));

    await waitFor(() => expect(withResult.result).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('manual-log-add')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('manual-log-add'));
    expect(screen.getByTestId('manual-log-title')).toHaveValue('');
    expect(screen.getByLabelText('Log body')).toHaveValue('');
  });

  it('keeps the draft and explains a failed save, which can be dismissed', async () => {
    renderTab([addMock({ error: new Error('Lead was archived') })]);

    writeLog();
    fireEvent.click(screen.getByTestId('manual-log-save'));

    expect(await screen.findByText('Lead was archived')).toBeInTheDocument();
    expect(screen.getByTestId('manual-log-title')).toHaveValue('  Site visit ');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Lead was archived')).toBeNull());
  });

  it('locks the composer while saving', async () => {
    renderTab([addMock({ delay: Infinity })]);

    writeLog();
    fireEvent.click(screen.getByTestId('manual-log-save'));

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    for (const cancel of screen.getAllByRole('button', { name: 'Cancel' })) expect(cancel).toBeDisabled();
  });

  it('discards the draft from either cancel control', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('manual-log-add'));
    const [iconCancel] = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(iconCancel);
    expect(screen.queryByText('New manual log')).toBeNull();

    fireEvent.click(screen.getByTestId('manual-log-add'));
    const cancels = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(cancels.at(-1) as HTMLElement);
    expect(screen.queryByText('New manual log')).toBeNull();
  });
});

describe('ManualLogsTab list', () => {
  const activities = [
    note({ summary: 'Owner call', body_html: '<p>Agreed on rates</p>', created_by: 'Priya', created_at: '2026-09-15T11:00:00.000Z' }),
    note({ summary: 'Follow-up call', body_text: 'Call again Friday', created_at: '2026-09-15T10:00:00.000Z' }),
    note({ body_text: 'Plain-text note', created_at: '2026-09-10T08:00:00.000Z' }),
    note({ body_html: '   ', body_text: 'Imported note', created_at: '2026-08-01T08:00:00.000Z' }),
    note({ body_text: 'Undated note' }),
    { ...note({ summary: 'Sent intro' }), type: 'EMAIL' },
  ];

  it('shows notes newest first with their author, falling back to plain text', () => {
    renderTab([], activities);

    expect(screen.getByText('Owner call')).toBeInTheDocument();
    expect(screen.getByText('by Priya')).toBeInTheDocument();
    expect(screen.getByTestId('note-body')).toHaveTextContent('<p>Agreed on rates</p>');
    expect(screen.getByText('Plain-text note')).toBeInTheDocument();
    expect(screen.getByText('Imported note')).toBeInTheDocument();
    expect(screen.getByText('Undated note')).toBeInTheDocument();
    expect(screen.queryByText('Sent intro')).toBeNull();
    expect(screen.getByText(/· 2 logs$/)).toBeInTheDocument();
    expect(screen.getAllByText(/· 1 log$/)).toHaveLength(3);
  });

  it('narrows the list to the chosen window', async () => {
    renderTab([], activities);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Time range' }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Today' }));

    await waitFor(() => expect(screen.queryByText('Plain-text note')).toBeNull());
    expect(screen.getByText('Owner call')).toBeInTheDocument();
  });
});

describe('logUtils', () => {
  it('formats a timestamp, keeps an unparsable one as is, and dashes a missing one', () => {
    expect(formatLogTimestamp('2026-09-15T08:00:00.000Z')).toBe(formatDateTime(new Date('2026-09-15T08:00:00.000Z')));
    expect(formatLogTimestamp('yesterday')).toBe('yesterday');
    expect(formatLogTimestamp(null)).toBe('—');
  });

  it('keys a log by what it carries, tolerating missing parts', () => {
    expect(logKey(note({ created_at: 'a', created_by: 'b', summary: 'c', body_text: 'd' }))).toBe('a|b|c|d');
    expect(logKey(note({}))).toBe('|||');
  });

  it('groups by day and windows by the last 7 or 30 days', () => {
    const notes = [
      note({ body_text: 'today', created_at: '2026-09-15T11:00:00.000Z' }),
      note({ body_text: 'also today', created_at: '2026-09-15T10:00:00.000Z' }),
      note({ body_text: 'last week', created_at: '2026-09-10T08:00:00.000Z' }),
      note({ body_text: 'last month', created_at: '2026-08-20T08:00:00.000Z' }),
    ];

    expect(groupLogs(notes, 'all')).toHaveLength(3);
    expect(groupLogs(notes, 'all')[0][1].map((n) => n.body_text)).toEqual(['today', 'also today']);
    expect(groupLogs(notes, 'week').flatMap(([, day]) => day).map((n) => n.body_text)).toEqual(['today', 'also today', 'last week']);
    expect(groupLogs(notes, 'month').flatMap(([, day]) => day)).toHaveLength(4);
  });
});
