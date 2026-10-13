import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';
import { columnValue } from '../mocks/table-stub';

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
}));

import EmailLogVars from '../../src/pages/email-logs-page/EmailLogVars';
import EmailLogMeta from '../../src/pages/email-logs-page/EmailLogMeta';
import EmailLogsTable from '../../src/pages/email-logs-page/EmailLogsTable';
import type { EmailLogDetail, EmailLogRow } from '../../src/pages/email-logs-page/queries';

const row = (over: Partial<EmailLogRow> = {}): EmailLogRow => ({
  id: 'L1',
  to: 'asha@example.test',
  cc: [],
  bcc: [],
  subject: 'Your spot was filled',
  template: 'pod-spot-filled',
  fragment_key: null,
  category: 'transactional',
  status: 'SENT',
  reason: '',
  provider: 'smtp',
  message_id: 'm-1',
  source: 'SERVER',
  source_detail: '',
  duration_ms: 42,
  created_at: '2026-08-06T10:00:00.000Z',
  ...over,
});

describe('EmailLogVars', () => {
  it('lists each variable and the stored JSON', () => {
    renderWithProviders(<EmailLogVars json={JSON.stringify({ name: 'Asha', code: '' })} />);
    expect(screen.getByText('{{name}}')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getByText('As stored')).toBeInTheDocument();
  });

  it('says a raw-HTML send had no variables', () => {
    const { unmount } = renderWithProviders(<EmailLogVars json="  " />);
    expect(screen.getByText(/No variables/)).toBeInTheDocument();
    unmount();
    renderWithProviders(<EmailLogVars json={null} />);
    expect(screen.getByText(/No variables/)).toBeInTheDocument();
  });

  it('shows unparseable and non-object values exactly as stored, without a table', () => {
    const { container, unmount } = renderWithProviders(<EmailLogVars json="not json {" />);
    expect(container.querySelector('pre')).toHaveTextContent('not json {');
    expect(screen.queryByText(/\{\{/)).not.toBeInTheDocument();
    unmount();
    const second = renderWithProviders(<EmailLogVars json="42" />);
    expect(second.container.querySelector('pre')).toHaveTextContent('42');
  });
});

describe('EmailLogMeta', () => {
  const detail = (over: Partial<EmailLogRow> = {}) =>
    ({ ...row(over), body_html: '', vars: '' }) as unknown as EmailLogDetail;

  it('links to the template and header/footer the email carried', () => {
    renderWithProviders(<EmailLogMeta row={detail({ fragment_key: 'transactional' })} />);
    expect(screen.getByRole('link', { name: /pod-spot-filled/ })).toHaveAttribute(
      'href',
      '/emails/templates?slug=pod-spot-filled'
    );
    expect(screen.getByRole('link', { name: /transactional/ })).toHaveAttribute(
      'href',
      '/emails/fragments?key=transactional'
    );
  });

  it('says a raw-HTML send had no template and shows the failure reason', () => {
    renderWithProviders(
      <EmailLogMeta row={detail({ template: '', status: 'FAILED', reason: 'Mailbox full' })} />
    );
    expect(screen.getByText('— raw HTML send')).toBeInTheDocument();
    expect(screen.getByText('Mailbox full')).toBeInTheDocument();
  });

  it('shows cc and bcc, and counts recipients on a long message', () => {
    const many = Array.from({ length: 12 }, (_, i) => `someone-with-a-long-name-${i}@example.test`);
    renderWithProviders(<EmailLogMeta row={detail({ cc: many, bcc: ['audit@example.test'] })} />);
    expect(screen.getByText('CC')).toBeInTheDocument();
    expect(screen.getByText('BCC')).toBeInTheDocument();
    expect(screen.getByText(/14 recipients on this message/)).toBeInTheDocument();
  });

  it('dashes a blank provider and shows an unknown status in a neutral chip', () => {
    renderWithProviders(
      <EmailLogMeta row={detail({ provider: '', status: 'QUEUED' as EmailLogRow['status'] })} />
    );
    expect(screen.getByText('QUEUED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the source detail in place of the source when there is one', () => {
    renderWithProviders(<EmailLogMeta row={detail({ source_detail: 'cron:weekly' })} />);
    expect(screen.getByText('cron:weekly')).toBeInTheDocument();
  });
});

describe('EmailLogsTable', () => {
  const mount = (rows: EmailLogRow[]) => {
    const onRowClick = vi.fn();
    const fetchRows = vi.fn().mockResolvedValue({ rows, total: rows.length });
    renderWithProviders(
      <EmailLogsTable
        fetchRows={fetchRows}
        refetchRef={{ current: null }}
        onRowClick={onRowClick}
        selection={{ onChange: vi.fn(), clearRef: { current: null } }}
        externalFilters={[]}
      />
    );
    return { onRowClick, fetchRows };
  };

  it('draws recipient and subject, the template with its fragment, the reason and source', async () => {
    mount([
      row({ fragment_key: 'transactional', status: 'FAILED', reason: 'Mailbox full', source_detail: 'cron' }),
    ]);
    const r = await screen.findByTestId('row-L1');
    expect(within(r).getByText('asha@example.test')).toBeInTheDocument();
    expect(within(r).getByText('Your spot was filled')).toBeInTheDocument();
    expect(within(r).getByText('pod-spot-filled')).toBeInTheDocument();
    expect(within(r).getByText('+ transactional')).toBeInTheDocument();
    expect(within(r).getByText('Mailbox full')).toBeInTheDocument();
    expect(within(r).getByText('FAILED')).toBeInTheDocument();
    expect(within(r).getByText('42 ms')).toBeInTheDocument();
  });

  it('shows dashes for what a raw send did not carry', async () => {
    mount([row({ to: '', subject: '', template: '', reason: '', provider: '', message_id: '' })]);
    const r = await screen.findByTestId('row-L1');
    expect(within(r).getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('sorts, filters and exports by plain values, with a dash for what is blank', async () => {
    mount([row()]);
    await screen.findByTestId('row-L1');
    const full = row({ reason: 'Mailbox full' });
    const blank = row({ to: '', reason: '', template: '', provider: '', message_id: '' });
    expect(columnValue('status', full)).toBe('SENT');
    expect(columnValue('to', full)).toBe('asha@example.test');
    expect(columnValue('to', blank)).toBe('—');
    expect(columnValue('reason', full)).toBe('Mailbox full');
    expect(columnValue('reason', blank)).toBe('—');
    expect(columnValue('template', full)).toBe('pod-spot-filled');
    expect(columnValue('template', blank)).toBe('—');
    expect(columnValue('category', full)).toBe('transactional');
    expect(columnValue('source', full)).toBe('SERVER');
    expect(columnValue('provider', blank)).toBe('—');
    expect(columnValue('duration_ms', full)).toBe('42 ms');
    expect(columnValue('message_id', full)).toBe('m-1');
    expect(columnValue('message_id', blank)).toBe('—');
  });

  it('falls back to a neutral chip for a status the page does not know', async () => {
    mount([row({ status: 'QUEUED' as EmailLogRow['status'] })]);
    const r = await screen.findByTestId('row-L1');
    expect(within(r).getByText('QUEUED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('opens the drawer for the clicked row', async () => {
    const { onRowClick } = mount([row()]);
    fireEvent.click(await screen.findByRole('button', { name: 'open-L1' }));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'L1' }));
  });
});
