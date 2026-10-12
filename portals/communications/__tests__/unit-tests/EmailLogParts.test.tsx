import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';

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

  it('opens the drawer for the clicked row', async () => {
    const { onRowClick } = mount([row()]);
    fireEvent.click(await screen.findByRole('button', { name: 'open-L1' }));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'L1' }));
  });
});
