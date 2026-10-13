import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WaCampaignRecipientRow, WaCampaignRow } from '../../src/pages/whatsapp-page/queries';
import { renderWithProviders } from '../testkit';
import { columnValue } from '../mocks/table-stub';

const m = vi.hoisted(() => ({
  campaign: undefined as unknown,
  loading: false,
  recipients: [] as unknown[],
  fetchCsv: vi.fn(),
  exporting: false,
  download: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: () => ({ data: m.campaign ? { waCampaign: m.campaign } : undefined, loading: m.loading }),
  useLazyQuery: () => [m.fetchCsv, { loading: m.exporting }],
  useApolloClient: () => ({}),
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
  useApolloTableFetch: () => () =>
    Promise.resolve({ rows: m.recipients, total: m.recipients.length }),
}));
vi.mock('@duncit/utils', async (io) => ({
  ...(await io<typeof import('@duncit/utils')>()),
  downloadTextFile: m.download,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifyError: m.notifyError,
}));
vi.mock('../../src/pages/whatsapp-page/wa-message', () => ({
  default: (p: { campaignName: string; params: string[] }) => (
    <div>
      message:{p.campaignName}:{p.params.join('|')}
    </div>
  ),
}));

import WaCampaignDetailDialog from '../../src/pages/whatsapp-page/wa-campaign-detail';

const campaign = (over: Partial<WaCampaignRow> = {}): WaCampaignRow => ({
  campaign_id: 'c1',
  name: 'Diwali blast',
  wa_campaign_name: 'diwali_camp',
  audience: 'AUDIENCE_LIST',
  audience_list_id: 'list-1',
  user_ids: [],
  contacts: [],
  template_name: 'diwali_tpl',
  template_category: 'MARKETING',
  media: null,
  msg_rate: 0.785,
  cost: 10,
  template_params: ['Asha'],
  status: 'SENT',
  scheduled_at: null,
  recipient_count: 100,
  sent_count: 90,
  failed_count: 6,
  skipped_count: 4,
  error: null,
  sent_at: '2026-08-06T10:00:00.000Z',
  created_at: '2026-08-06T09:00:00.000Z',
  updated_at: null,
  ...over,
});

const recipient = (over: Partial<WaCampaignRecipientRow> = {}): WaCampaignRecipientRow => ({
  id: 'r1',
  name: 'Asha',
  destination: '+910000000001',
  status: 'SENT',
  reason: '',
  submitted_message_id: 'mid-1',
  template_params: ['Asha', 'Diwali'],
  attempts: 1,
  created_at: '2026-08-06T10:00:00.000Z',
  updated_at: null,
  ...over,
});

const handlers = () => ({
  onRetry: vi.fn(),
  onCancel: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onClose: vi.fn(),
});

const show = (props: Record<string, unknown> = {}) => {
  const h = handlers();
  renderWithProviders(
    <WaCampaignDetailDialog
      campaignId="c1"
      audienceLists={[{ id: 'list-1', name: 'VIP list' } as never]}
      currency="$"
      retrying={false}
      cancelling={false}
      {...h}
      {...props}
    />
  );
  return h;
};

beforeEach(() => {
  m.campaign = campaign();
  m.loading = false;
  m.exporting = false;
  m.recipients = [recipient()];
  m.fetchCsv.mockReset().mockResolvedValue({ data: { waCampaignRecipientsCsv: 'a,b\n1,2' } });
  m.download.mockReset();
  m.notifyError.mockReset();
});

describe('WaCampaignDetailDialog - content', () => {
  it('shows the counters, the audience with its list name, and the frozen cost', async () => {
    show();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Diwali blast')).toBeInTheDocument();
    expect(within(dialog).getByText('100')).toBeInTheDocument();
    expect(within(dialog).getByText('90')).toBeInTheDocument();
    expect(within(dialog).getByText(/Saved audience list · VIP list/)).toBeInTheDocument();
    expect(within(dialog).getByText('Marketing')).toBeInTheDocument();
    expect(within(dialog).getByText(/0\.785.*\/msg × 90 sent/)).toBeInTheDocument();
    expect(within(dialog).getByText('message:diwali_camp:Asha')).toBeInTheDocument();
  });

  it('lists the recipients with the reason a person was skipped', async () => {
    m.recipients = [
      recipient(),
      recipient({ id: 'r2', name: '', destination: '+910000000002', status: 'SKIPPED', reason: 'No number', template_params: [] }),
    ];
    show();
    const first = await screen.findByTestId('row-r1');
    expect(within(first).getByText('Asha · Diwali')).toBeInTheDocument();
    const second = await screen.findByTestId('row-r2');
    expect(within(second).getByText('No number')).toBeInTheDocument();
    expect(within(second).getByText('—', { selector: 'div[data-field="template_params"]' })).toBeInTheDocument();
  });

  it('shows the send error, a missing rate, a schedule, and an unfinished send', async () => {
    m.campaign = campaign({
      error: 'AiSensy outage',
      msg_rate: 0,
      template_name: '',
      scheduled_at: '2026-09-01T10:00:00.000Z',
      sent_at: null,
      audience_list_id: null,
      audience: 'ALL_USERS',
    });
    show();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('AiSensy outage')).toBeInTheDocument();
    expect(within(dialog).getByText(/No rate/)).toBeInTheDocument();
    expect(within(dialog).getByText('Not known')).toBeInTheDocument();
    expect(within(dialog).getByText('Still sending')).toBeInTheDocument();
    expect(within(dialog).getByText('All users')).toBeInTheDocument();
  });

  it('shows a spinner while the campaign loads, and stays closed without an id', () => {
    m.campaign = undefined;
    m.loading = true;
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('opens one recipient message, and explains an undelivered one', async () => {
    m.recipients = [
      recipient({ id: 'r2', status: 'FAILED', reason: 'Not on WhatsApp', template_params: ['Asha'] }),
    ];
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'open-r2' }));
    const dialogs = await screen.findAllByRole('dialog');
    const personal = dialogs.at(-1)!;
    expect(within(personal).getByText('Not on WhatsApp')).toBeInTheDocument();
    expect(within(personal).getByText('+910000000001')).toBeInTheDocument();
    expect(within(personal).queryByText(/^message:/)).not.toBeInTheDocument();
  });
});

describe('WaCampaignDetailDialog - recipient table', () => {
  it('sorts, filters and exports by plain values, with a dash for what is blank', async () => {
    m.recipients = [recipient()];
    show();
    await screen.findByTestId('row-r1');
    const full = recipient({ reason: 'Not on WhatsApp' });
    const blank = recipient({ name: '', reason: '', submitted_message_id: '', template_params: [] });
    expect(columnValue('name', full)).toBe('Asha');
    expect(columnValue('status', full)).toBe('SENT');
    expect(columnValue('reason', full)).toBe('Not on WhatsApp');
    expect(columnValue('reason', blank)).toBe('—');
    expect(columnValue('template_params', full)).toBe('Asha · Diwali');
    expect(columnValue('template_params', blank)).toBe('—');
    expect(columnValue('submitted_message_id', full)).toBe('mid-1');
    expect(columnValue('submitted_message_id', blank)).toBe('—');
  });

  it('titles a nameless recipient by their number, and closes the message', async () => {
    m.recipients = [recipient({ id: 'r3', name: '' })];
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'open-r3' }));
    const personal = (await screen.findAllByRole('dialog')).at(-1)!;
    expect(within(personal).getAllByText('+910000000001').length).toBeGreaterThanOrEqual(2);
    fireEvent.keyDown(personal, { key: 'Escape' });
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
  });
});

describe('WaCampaignDetailDialog - actions', () => {
  const button = async (name: RegExp | string) =>
    within(await screen.findByRole('dialog')).findByRole('button', { name });

  it('retries only the unreached people, with their count in the label', async () => {
    const h = show();
    const retry = await button(/10/);
    fireEvent.click(retry);
    expect(h.onRetry).toHaveBeenCalledWith(expect.objectContaining({ campaign_id: 'c1' }));
  });

  it('disables retry when everyone was reached', async () => {
    m.campaign = campaign({ failed_count: 0, skipped_count: 0 });
    show();
    expect(await button(/everyone was reached/i)).toBeDisabled();
  });

  it('downloads the recipients as a CSV named after the campaign', async () => {
    show();
    fireEvent.click(await button(/csv/i));
    await waitFor(() =>
      expect(m.download).toHaveBeenCalledWith('a,b\n1,2', 'Diwali blast-recipients.csv', 'text/csv')
    );
    expect(m.fetchCsv).toHaveBeenCalledWith({ variables: { campaign_id: 'c1' } });
  });

  it('downloads nothing when the server returns no CSV', async () => {
    m.fetchCsv.mockResolvedValue({ data: { waCampaignRecipientsCsv: '' } });
    show();
    fireEvent.click(await button(/csv/i));
    await waitFor(() => expect(m.fetchCsv).toHaveBeenCalled());
    expect(m.download).not.toHaveBeenCalled();
  });

  it('tells the operator when the CSV could not be built', async () => {
    m.fetchCsv.mockRejectedValue(new Error('Export timed out'));
    show();
    fireEvent.click(await button(/csv/i));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('Export timed out'));
    expect(m.download).not.toHaveBeenCalled();
  });

  it('shows the building label and disables the export while it runs', async () => {
    m.exporting = true;
    show();
    expect(await button(/building/i)).toBeDisabled();
  });

  it('shows the cancelling label while a cancel is in flight', async () => {
    m.campaign = campaign({ status: 'SCHEDULED' });
    show({ cancelling: true });
    expect(await button(/cancelling/i)).toBeDisabled();
  });

  it('shows the retrying label while a retry is in flight', async () => {
    show({ retrying: true });
    expect(await button(/retrying/i)).toBeDisabled();
  });

  it('duplicates, deletes and closes', async () => {
    const h = show();
    fireEvent.click(await button(/duplicate/i));
    expect(h.onDuplicate).toHaveBeenCalled();
    fireEvent.click(await button('Delete'));
    expect(h.onDelete).toHaveBeenCalled();
    fireEvent.click(await button('Close'));
    expect(h.onClose).toHaveBeenCalled();
  });

  it('offers no duplicate where no send can be started', async () => {
    show({ onDuplicate: undefined });
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: /duplicate/i })).not.toBeInTheDocument();
  });

  it('cancels a scheduled send but not a finished one', async () => {
    m.campaign = campaign({ status: 'SCHEDULED' });
    const h = show();
    fireEvent.click(await button(/cancel this send/i));
    expect(h.onCancel).toHaveBeenCalled();
  });

  it('keeps cancel disabled for a sent campaign, and delete disabled mid-send', async () => {
    m.campaign = campaign({ status: 'SENDING' });
    show();
    expect(await button(/cancel this send/i)).toBeDisabled();
    expect(await button('Delete')).toBeDisabled();
  });
});
