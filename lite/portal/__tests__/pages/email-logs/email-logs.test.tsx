import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAmbientDateSettings } from '@duncit/app-settings';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { LITE_EMAIL_LOGS_TABLE, type LiteEmailLogRow } from '../../../graphql/email';
import { EmailLogsPage } from '../../../pages/email-logs';
import { buildEmailLogColumns, emailLogRowId } from '../../../pages/email-logs/columns';
import { EmailLogDrawer } from '../../../pages/email-logs/EmailLogDrawer';
import { makeEmailLog } from '../../fixtures';
import { anyVariables, gqlEmailLog, tablePage } from '../../gql-results';
import { portalT, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

beforeAll(() => setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', timeZone: 'UTC', timeZoneAware: true }));
afterAll(() => setAmbientDateSettings({}));

const failed = makeEmailLog({ id: 'log-2', status: 'FAILED', error: 'Mailbox full', message_id: null });

describe('email log columns', () => {
  const columns = buildEmailLogColumns(portalT);
  const column = (field: string): DuncitColumn<LiteEmailLogRow> => {
    const found = columns.find((c) => c.field === field);
    if (!found) throw new Error(`no column ${field}`);
    return found;
  };

  it('keys rows by id and heads the columns in English', () => {
    expect(emailLogRowId(makeEmailLog())).toBe('log-1');
    expect(columns.map((c) => c.headerName)).toEqual(['To', 'Subject', 'Template', 'Status', 'Error', 'Sent']);
  });

  it('exports the status in words, the error or a dash, and the send time', () => {
    expect(column('status').valueGetter?.(failed)).toBe('Failed');
    expect(column('error').valueGetter?.(failed)).toBe('Mailbox full');
    expect(column('error').valueGetter?.(makeEmailLog())).toBe(EM_DASH);
    expect(column('created_at').valueGetter?.(makeEmailLog())).toBe('2026-03-15 · 14:30');
  });

  it('draws a failed send as an error chip', () => {
    render(<>{column('status').cellRenderer?.(failed)}</>);
    expect(screen.getByText('Failed').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });
});

/** The drawer's description list as label → value. */
const details = (): Record<string, string | null | undefined> =>
  Object.fromEntries([...document.querySelectorAll('dt')].map((dt) => [dt.textContent ?? '', dt.nextElementSibling?.textContent]));

describe('EmailLogDrawer', () => {
  it('lays out every detail of a sent message as a description list', () => {
    render(<EmailLogDrawer log={makeEmailLog()} onClose={vi.fn()} />);
    expect(within(screen.getByRole('presentation')).getByRole('heading', { level: 2, name: 'Email details' })).toBeInTheDocument();
    expect(details()).toEqual({
      To: 'ravi@lite.example',
      Subject: 'You are going to Jazz Night',
      Template: 'registration_confirmed',
      Status: 'Sent',
      Sent: '2026-03-15 · 14:30',
      'Message ID': '<abc@mail.example>',
      Error: 'No error recorded',
    });
  });

  it("shows a failure's error and a dash for the missing message id", () => {
    render(<EmailLogDrawer log={failed} onClose={vi.fn()} />);
    expect(details()).toMatchObject({ Status: 'Failed', 'Message ID': EM_DASH, Error: 'Mailbox full' });
  });

  it('closes from its close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EmailLogDrawer log={makeEmailLog()} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is closed while no log is picked', () => {
    render(<EmailLogDrawer log={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Email details')).not.toBeInTheDocument();
  });
});

describe('EmailLogsPage', () => {
  it('opens the details of the row the admin clicks and closes them again', async () => {
    const user = userEvent.setup();
    const table: GqlMock = { request: { query: LITE_EMAIL_LOGS_TABLE, variables: anyVariables }, result: { data: { liteEmailLogsTable: tablePage('LiteEmailLogsPage', [gqlEmailLog(failed)]) } } };
    renderWithProviders(<EmailLogsPage />, { mocks: [table] });
    expect(screen.getByRole('heading', { level: 1, name: 'Email logs' })).toBeInTheDocument();
    await user.click(await screen.findByTestId('row-log-2'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Email details' })).toBeInTheDocument();
    expect(screen.getAllByText('Mailbox full').length).toBeGreaterThan(0);
    await user.click(screen.getByTestId('email-log-drawer-close'));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Email details' })).not.toBeInTheDocument());
  });
});
