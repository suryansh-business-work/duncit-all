import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { getLogColumns } from '../../src/pages/whatsapp-page/wa-logs/logColumns';
import {
  WHATSAPP_MESSAGE_LOG,
  type WaLogRow,
  type WaMessageLogRow,
} from '../../src/pages/whatsapp-page/queries';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  rows: [] as unknown[],
  detail: vi.fn(),
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
  useApolloTableFetch: () => () => Promise.resolve({ rows: m.rows, total: m.rows.length }),
}));
vi.mock('../../src/pages/whatsapp-page/wa-campaign-detail', () => ({
  default: (p: {
    campaignId: string | null;
    onDelete: (r: unknown) => void;
    onDuplicate?: (r: unknown) => void;
    onClose: () => void;
  }) =>
    p.campaignId ? (
      <div>
        <span>detail:{p.campaignId}</span>
        <button type="button" onClick={() => p.onDelete({ campaign_id: p.campaignId, name: 'Diwali' })}>
          ask-delete
        </button>
        <button type="button" onClick={p.onClose}>
          close-detail
        </button>
        {p.onDuplicate && (
          <button type="button" onClick={() => p.onDuplicate?.({ campaign_id: p.campaignId })}>
            ask-duplicate
          </button>
        )}
      </div>
    ) : null,
}));
vi.mock('../../src/pages/whatsapp-page/wa-message', () => ({
  default: (p: { campaignName: string; params: string[]; labels?: readonly string[] }) => (
    <>
      <div>
        sent:{p.campaignName}:{p.params.join('|')}
      </div>
      <div>labels:{p.labels ? p.labels.join('|') : 'none'}</div>
    </>
  ),
}));

import WaLogs from '../../src/pages/whatsapp-page/wa-logs';
import AutoLogDetail from '../../src/pages/whatsapp-page/wa-logs/AutoLogDetail';

const log = (over: Partial<WaLogRow> = {}): WaLogRow => ({
  id: 'L1',
  kind: 'CAMPAIGN',
  name: 'Diwali blast',
  reference: 'diwali_camp',
  target: 'All users',
  status: 'SENT',
  category: 'MARKETING',
  recipient_count: 1200,
  sent_count: 1150,
  failed_count: 30,
  skipped_count: 20,
  msg_rate: 0.785,
  cost: 902.75,
  reason: '',
  created_at: '2026-08-06T10:00:00.000Z',
  ...over,
});

const t = (key: string, opts?: { vars?: Record<string, string> }) =>
  opts?.vars ? `${key}:${JSON.stringify(opts.vars)}` : key;

const columns = () =>
  getLogColumns({ t: t as never, formatDateTime: (v) => `fmt(${v})`, currency: '$' });

const cell = (field: string, row: WaLogRow): ReactNode => {
  const col = columns().find((c) => c.field === field)!;
  return (col.cellRenderer as (r: WaLogRow) => ReactNode)(row);
};
const value = (field: string, row: WaLogRow) =>
  (columns().find((c) => c.field === field)!.valueGetter as (r: WaLogRow) => string)(row);

describe('log columns', () => {
  it('formats the date and falls back to a dash with no timestamp', () => {
    expect(value('created_at', log())).toBe('fmt(2026-08-06T10:00:00.000Z)');
    expect(value('created_at', log({ created_at: null }))).toBe('—');
  });

  it('provides search text for every column', () => {
    const row = log();
    expect(value('kind', row)).toBe('marketingWhatsapp.logs.kindCampaign');
    expect(value('name', row)).toBe('Diwali blast diwali_camp');
    expect(value('target', row)).toBe('All users');
    expect(value('target', log({ target: '' }))).toBe('—');
    expect(value('status', row)).toBe('SENT');
    expect(value('sent_count', row)).toBe('1150 / 1200');
    expect(value('reason', row)).toBe('—');
    expect(value('reason', log({ reason: 'No opt-in' }))).toBe('No opt-in');
    expect(value('cost', row)).toContain('902.75');
    expect(value('category', row)).toBe('Marketing');
    expect(value('category', log({ category: '' }))).toBe('Not categorised');
  });

  it('draws kind, send, reach, reason and cost cells from the row', () => {
    renderWithProviders(
      <>
        {cell('kind', log({ kind: 'AUTOMATIC' }))}
        {cell('name', log({ kind: 'AUTOMATIC', name: '', reference: 'order_placed' }))}
        {cell('sent_count', log())}
        {cell('reason', log({ reason: 'Number not on WhatsApp' }))}
        {cell('cost', log())}
        {cell('status', log({ status: 'FAILED' }))}
      </>
    );
    expect(screen.getByText('marketingWhatsapp.logs.kindAutomatic')).toBeInTheDocument();
    expect(screen.getByText('order_placed')).toBeInTheDocument();
    expect(screen.getByText('1,150 / 1,200')).toBeInTheDocument();
    expect(screen.getByText(/marketingWhatsapp.logs.reachHint/)).toHaveTextContent('"failed":"30"');
    expect(screen.getByText('Number not on WhatsApp')).toBeInTheDocument();
    expect(screen.getByText(/902\.75/)).toBeInTheDocument();
    expect(screen.getByText(/marketingWhatsapp.logs.perMessage/)).toHaveTextContent('0.785');
    expect(screen.getByText('adminWhatsapp.statusFailed')).toBeInTheDocument();
  });

  it('falls back to the raw kind and status when the server sends one this build does not know', () => {
    const row = log({ kind: 'IMPORTED' as never, status: 'PAUSED' });
    expect(value('kind', row)).toBe('IMPORTED');
    renderWithProviders(
      <>
        {cell('kind', row)}
        {cell('status', row)}
      </>
    );
    expect(screen.getByText('IMPORTED')).toBeInTheDocument();
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
  });

  it('hides the failure line on a clean send, shows a dash for no reason, and says when no rate was frozen', () => {
    renderWithProviders(
      <>
        {cell('sent_count', log({ failed_count: 0, skipped_count: 0 }))}
        {cell('reason', log({ reason: '' }))}
        {cell('cost', log({ msg_rate: 0, cost: 0 }))}
      </>
    );
    expect(screen.queryByText(/reachHint/)).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('marketingWhatsapp.logs.noRate')).toBeInTheDocument();
  });
});

const detailRow = (over: Partial<WaMessageLogRow> = {}): WaMessageLogRow => ({
  id: 'M1',
  event_key: 'order_placed',
  campaign: 'order_camp',
  category: 'TRANSACTIONAL',
  audience: 'USER',
  destination: '+910000000000',
  status: 'FAILED',
  reason: 'Media URL Missing',
  params: ['Asha', 'ORD-1'],
  media_url: '',
  media_filename: '',
  submitted_message_id: 'mid-1',
  template_category: 'UTILITY',
  msg_rate: 0.145,
  duration_ms: 320,
  created_at: '2026-08-06T10:00:00.000Z',
  ...over,
});

const detailMock = (row: WaMessageLogRow | null): MockedResponse => ({
  request: { query: WHATSAPP_MESSAGE_LOG, variables: { id: 'M1' } },
  result: { data: { whatsappMessageLog: row && { __typename: 'WhatsappMessageLog', ...row } } },
});

describe('AutoLogDetail', () => {
  it('stays closed without a log id', () => {
    renderWithProviders(<AutoLogDetail logId={null} currency="$" onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows why an automatic message did not arrive, with the values and ids behind it', async () => {
    renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={vi.fn()} />, {
      mocks: [detailMock(detailRow())],
    });
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Media URL Missing')).toBeInTheDocument();
    expect(within(dialog).getByText('sent:order_camp:Asha|ORD-1')).toBeInTheDocument();
    expect(within(dialog).getByText('mid-1')).toBeInTheDocument();
    expect(within(dialog).getByText('+910000000000')).toBeInTheDocument();
    expect(within(dialog).getByText('320 ms')).toBeInTheDocument();
    expect(within(dialog).getByText('Utility')).toBeInTheDocument();
  });

  it('shows dashes for what a failed send never recorded and no info banner without a reason', async () => {
    renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={vi.fn()} />, {
      mocks: [
        detailMock(
          detailRow({
            reason: '',
            campaign: '',
            destination: '',
            audience: '',
            submitted_message_id: '',
            created_at: null,
            media_url: 'https://cdn.example.test/a.png',
            media_filename: 'a.png',
          })
        ),
      ],
    });
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('order_placed')).toBeInTheDocument());
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(dialog).getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('labels the values from the scenario registry, and leaves an unknown scenario unlabelled', async () => {
    const known = renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={vi.fn()} />, {
      mocks: [detailMock(detailRow({ event_key: 'USER_WELCOME', params: ['Asha'] }))],
    });
    expect(await screen.findByText('labels:Recipient name')).toBeInTheDocument();
    known.unmount();

    renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={vi.fn()} />, {
      mocks: [detailMock(detailRow())],
    });
    expect(await screen.findByText('labels:none')).toBeInTheDocument();
  });

  it('shows a dash for a log with no category of ours', async () => {
    renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={vi.fn()} />, {
      mocks: [detailMock(detailRow({ category: '' }))],
    });
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('order_placed')).toBeInTheDocument());
    // Every other meta row has a value, so the one dash is the category.
    expect(within(dialog).getAllByText('—')).toHaveLength(1);
  });

  it('says the log is gone when the server has no such row', async () => {
    renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={vi.fn()} />, {
      mocks: [detailMock(null)],
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('closes from the footer button', async () => {
    const onClose = vi.fn();
    renderWithProviders(<AutoLogDetail logId="M1" currency="$" onClose={onClose} />, {
      mocks: [detailMock(detailRow())],
    });
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('WaLogs', () => {
  const actions = (over = {}) =>
    ({
      remove: vi.fn().mockResolvedValue(true),
      retry: vi.fn(),
      cancel: vi.fn(),
      retrying: false,
      cancelling: false,
      deleting: false,
      ...over,
    }) as never;

  const mount = (props: Record<string, unknown> = {}) =>
    renderWithProviders(
      <WaLogs
        audienceLists={[]}
        actions={actions()}
        refetchRef={{ current: null }}
        campaigns={[]}
        onClearCampaigns={vi.fn()}
        {...props}
      />,
      { mocks: [detailMock(detailRow())] }
    );

  beforeEach(() => {
    m.rows = [log(), log({ id: 'M1', kind: 'AUTOMATIC', name: 'Order placed', reference: 'order_placed' })];
  });

  it('lists campaign and automatic sends in one feed', async () => {
    mount();
    expect(await screen.findByTestId('row-CAMPAIGN-L1')).toBeInTheDocument();
    expect(screen.getByTestId('row-AUTOMATIC-M1')).toBeInTheDocument();
  });

  it('opens the campaign detail for a campaign row and the message detail for an automatic one', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    expect(screen.getByText('detail:L1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open-AUTOMATIC-M1' }));
    expect(screen.queryByText('detail:L1')).not.toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows the narrowing banner and clears it', async () => {
    const onClearCampaigns = vi.fn();
    mount({ campaigns: ['diwali_camp', 'holi'], onClearCampaigns });
    expect(await screen.findByText(/diwali_camp, holi/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show everything' }));
    expect(onClearCampaigns).toHaveBeenCalled();
  });

  it('deletes a campaign after confirmation and closes the detail', async () => {
    const actionSet = actions();
    mount({ actions: actionSet });
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ask-delete' }));
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect((actionSet as { remove: ReturnType<typeof vi.fn> }).remove).toHaveBeenCalledWith({
        campaign_id: 'L1',
        name: 'Diwali',
      })
    );
    await waitFor(() => expect(screen.queryByText('detail:L1')).not.toBeInTheDocument());
  });

  it('closes the detail and hands the campaign over when duplicating', async () => {
    const onDuplicate = vi.fn();
    mount({ onDuplicate });
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ask-duplicate' }));
    expect(onDuplicate).toHaveBeenCalledWith({ campaign_id: 'L1' });
    expect(screen.queryByText('detail:L1')).not.toBeInTheDocument();
  });

  it('offers no duplicate where no send can be started', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    expect(screen.queryByRole('button', { name: 'ask-duplicate' })).not.toBeInTheDocument();
  });

  it('closes the campaign detail from its own close', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    fireEvent.click(screen.getByRole('button', { name: 'close-detail' }));
    expect(screen.queryByText('detail:L1')).not.toBeInTheDocument();
  });

  it('closes the automatic message detail from its Close button', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'open-AUTOMATIC-M1' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('backs out of the delete without removing anything', async () => {
    const actionSet = actions();
    mount({ actions: actionSet });
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ask-delete' }));
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((actionSet as { remove: ReturnType<typeof vi.fn> }).remove).not.toHaveBeenCalled();
    expect(screen.getByText('detail:L1')).toBeInTheDocument();
  });

  it('keeps the detail open when the delete was refused', async () => {
    mount({ actions: actions({ remove: vi.fn().mockResolvedValue(false) }) });
    fireEvent.click(await screen.findByRole('button', { name: 'open-CAMPAIGN-L1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ask-delete' }));
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText('detail:L1')).toBeInTheDocument());
  });
});
