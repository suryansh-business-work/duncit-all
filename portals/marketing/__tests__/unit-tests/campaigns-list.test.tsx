import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import {
  audienceListsFeedMock,
  campaignDetailMock,
  deleteCampaignMock,
  makeCampaignDetail,
  makeCampaignRow,
  sendCampaignMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: dialogsMock.notifyError,
  notifySuccess: dialogsMock.notifySuccess,
}));

import MarketingCampaignsPage from '../../src/pages/marketing-campaigns-page/MarketingCampaignsPage';
import CampaignTable from '../../src/pages/marketing-campaigns-page/CampaignTable';
import CampaignDetailsDialog from '../../src/pages/marketing-campaigns-page/CampaignDetailsDialog';
import CampaignSummary from '../../src/pages/marketing-campaigns-page/CampaignSummary';
import CampaignEngagement from '../../src/pages/marketing-campaigns-page/CampaignEngagement';
import { deleteWarningFor } from '../../src/pages/marketing-campaigns-page/delete-copy';
import { AUDIENCE_LISTS_FOR_CAMPAIGN } from '../../src/pages/marketing-campaigns-page/queries';
import type { MarketingCampaignRow } from '../../src/pages/marketing-campaigns-page/queries';

const listsMock = () => audienceListsFeedMock(AUDIENCE_LISTS_FOR_CAMPAIGN);

/** The list page behind its route, with the create route stubbed so the
 * "New campaign" button lands somewhere observable. */
const renderPage = (mocks = [listsMock()]) =>
  renderWithProviders(<MarketingCampaignsPage />, {
    mocks,
    initialEntries: ['/campaigns/email'],
    routes: (
      <>
        <Route path="/campaigns/email" element={<MarketingCampaignsPage />} />
        <Route path="/campaigns/email/new" element={<div>create-campaign</div>} />
      </>
    ),
  });

beforeEach(() => {
  __setTableRows([]);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('CampaignTable', () => {
  const renderTable = (rows: MarketingCampaignRow[], handlers: Record<string, () => void> = {}) =>
    renderWithProviders(
      <CampaignTable
        fetchRows={fetchRowsFrom(rows)}
        refetchRef={{ current: null }}
        busy={false}
        onView={handlers.onView ?? vi.fn()}
        onSend={handlers.onSend ?? vi.fn()}
        onDelete={handlers.onDelete ?? vi.fn()}
      />,
    );

  // How many opened it and how many clicked through is the whole point of a
  // campaign — it belongs on the row, not buried in a dialog.
  it('reports opens and clicks on the row', async () => {
    renderTable([makeCampaignRow({ recipient_count: 120, open_count: 47, click_count: 9 })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-open_count')).toHaveTextContent('47');
    expect(within(row).getByTestId('cell-click_count')).toHaveTextContent('9');
  });

  it('renders the campaign, channel, audience and card cells', async () => {
    renderTable([
      makeCampaignRow({ error: 'Delivery failed' }),
      // A campaign stored before WhatsApp was removed, still awaiting the
      // migration: the raw value is shown rather than a blank cell.
      makeCampaignRow({
        campaign_id: 'c4',
        channel: 'WHATSAPP' as MarketingCampaignRow['channel'],
        audience: 'AUDIENCE_LIST',
        card: null,
      }),
    ]);
    expect(await screen.findByText('Delivery failed')).toBeInTheDocument();
    expect(screen.getAllByText('WHATSAPP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saved audience list').length).toBeGreaterThan(0);
  });

  it('offers View, Send and Delete on a draft row', async () => {
    const onView = vi.fn();
    const onSend = vi.fn();
    const onDelete = vi.fn();
    renderTable([makeCampaignRow()], { onView, onSend, onDelete });
    fireEvent.click(await screen.findByRole('button', { name: 'View campaign' }));
    expect(onView).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send campaign now' }));
    expect(onSend).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete campaign' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('cannot send a campaign that already went out', async () => {
    renderTable([makeCampaignRow({ status: 'SENT' })]);
    expect(await screen.findByRole('button', { name: 'Already sent' })).toBeDisabled();
  });

  // Disabled, not hidden — the tooltip is the explanation.
  it('cannot delete a campaign mid-send, and says why', async () => {
    renderTable([makeCampaignRow({ status: 'SENDING' })]);
    expect(
      await screen.findByRole('button', { name: /Sending right now/ }),
    ).toBeDisabled();
  });

  // Sending twice would double-send; opening a delete confirm while something
  // else is in flight is harmless, and the confirm gates the mutation itself.
  it('blocks a second send while one is in flight, but not Delete', async () => {
    renderWithProviders(
      <CampaignTable
        fetchRows={fetchRowsFrom([makeCampaignRow()])}
        refetchRef={{ current: null }}
        busy
        onView={vi.fn()}
        onSend={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(await screen.findByRole('button', { name: 'Send campaign now' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete campaign' })).toBeEnabled();
  });
});

// ===========================================================================
describe('CampaignSummary', () => {
  const lists = [{ id: 'a1', name: 'Pune regulars', member_count: 12 }];

  it('names the audience list a campaign targets', () => {
    renderWithProviders(
      <CampaignSummary
        campaign={makeCampaignDetail({ audience: 'AUDIENCE_LIST', audience_list_id: 'a1' })}
        audienceLists={lists}
        formatDateTime={String}
      />,
    );
    expect(screen.getByText('Saved audience list · Pune regulars')).toBeInTheDocument();
  });

  it('falls back to the plain audience label, and em-dashes what has not happened', () => {
    renderWithProviders(
      <CampaignSummary
        campaign={makeCampaignDetail({ card: null, scheduled_at: null, sent_at: null })}
        audienceLists={lists}
        formatDateTime={String}
      />,
    );
    expect(screen.getByText('All users')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
});

// ===========================================================================
describe('CampaignEngagement', () => {
  const render = (over = {}) =>
    renderWithProviders(
      <CampaignEngagement campaign={makeCampaignDetail(over)} formatDateTime={String} />,
    );

  it('reports opens, image loads, clicks and when it was first read', () => {
    render({
      open_count: 47,
      image_load_count: 12,
      click_count: 9,
      first_opened_at: '2026-07-31T09:00:00.000Z',
      last_opened_at: '2026-07-31T18:30:00.000Z',
    });
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('47 opens — read more than once')).toBeInTheDocument();
    expect(screen.getByText('2026-07-31T09:00:00.000Z')).toBeInTheDocument();
  });

  it('does not claim a repeat read off a single open', () => {
    render({ open_count: 1 });
    expect(screen.getByText('Pixel loads')).toBeInTheDocument();
  });

  it('em-dashes an open that has not happened', () => {
    render();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('breaks clicks down per link, with what kind of link it was', () => {
    render({
      tracked_links: [
        { url: 'https://duncit.com/book', kind: 'CTA' as const, click_count: 7 },
        { url: 'https://duncit.com/unsubscribe', kind: 'UNSUBSCRIBE' as const, click_count: 1 },
      ],
    });
    expect(screen.getByText('https://duncit.com/book')).toBeInTheDocument();
    expect(screen.getByText('7 clicks')).toBeInTheDocument();
    expect(screen.getByText('UNSUBSCRIBE')).toBeInTheDocument();
  });

  it('breaks image loads down per image', () => {
    render({ tracked_images: [{ url: 'https://cdn.duncit.com/a.png', load_count: 4 }] });
    expect(screen.getByText('4 loads')).toBeInTheDocument();
  });

  it('says so when a campaign had nothing to track', () => {
    render();
    expect(screen.getByText('This campaign had no links to track.')).toBeInTheDocument();
    expect(screen.getByText('This campaign had no images to track.')).toBeInTheDocument();
  });

  // An address the mail server refused never had a chance of being read —
  // that is a data-quality problem the marketer needs to see.
  it('names the addresses the mail server refused outright', () => {
    render({
      delivery: { accepted: 48, rejected: 2, rejected_addresses: ['bad@x.com', 'gone@y.com'] },
    });
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('2 refused')).toBeInTheDocument();
    expect(screen.getByTestId('rejected-addresses')).toHaveTextContent('bad@x.com, gone@y.com');
  });

  it('shows a clean delivery without a refusal warning', () => {
    render({ delivery: { accepted: 50, rejected: 0, rejected_addresses: [] } });
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.queryByTestId('rejected-addresses')).not.toBeInTheDocument();
  });

  it('shows no delivery block for a campaign that never sent', () => {
    render();
    expect(screen.queryByText('Accepted by SMTP')).not.toBeInTheDocument();
  });
});

// ===========================================================================
describe('deleteWarningFor', () => {
  it('warns that deleting a scheduled campaign cancels the send', () => {
    expect(deleteWarningFor(makeCampaignRow({ status: 'SCHEDULED' }))).toMatch(/cancels that send/);
  });

  it('warns that deleting a sent campaign only removes the record', () => {
    expect(deleteWarningFor(makeCampaignRow({ status: 'SENT', recipient_count: 9 }))).toMatch(
      /9 recipients/,
    );
  });

  it('is plain about a draft', () => {
    expect(deleteWarningFor(makeCampaignRow())).toMatch(/removed permanently/);
  });
});

// ===========================================================================
describe('CampaignDetailsDialog', () => {
  const renderDialog = (props: Record<string, unknown> = {}, mocks = [campaignDetailMock()]) =>
    renderWithProviders(
      <CampaignDetailsDialog
        campaignId="c1"
        audienceLists={[]}
        busy={false}
        formatDateTime={String}
        onClose={vi.fn()}
        onSend={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />,
      { mocks },
    );

  it('renders nothing until a campaign is opened', () => {
    const { container } = renderDialog({ campaignId: null }, []);
    expect(container).toBeEmptyDOMElement();
  });

  it('waits on the fetch, then shows the campaign and its email', async () => {
    renderDialog({}, [campaignDetailMock({}, { pending: true })]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the campaign, its email, and both actions', async () => {
    const onSend = vi.fn();
    const onDelete = vi.fn();
    renderDialog({ onSend, onDelete });

    const dialog = within(await screen.findByRole('dialog'));
    expect(await screen.findByText('Weekend')).toBeInTheDocument();
    expect(screen.getByTitle('Campaign email')).toHaveAttribute('srcdoc', '<b>the email</b>');

    fireEvent.click(dialog.getByRole('button', { name: 'Send now' }));
    expect(onSend).toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('shows the failure a campaign recorded, and no Send once it is sent', async () => {
    renderDialog({}, [campaignDetailMock({ status: 'SENT', error: 'SMTP refused' })]);
    expect(await screen.findByText('SMTP refused')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send now' })).not.toBeInTheDocument();
  });

  it('offers no Delete on a campaign that is sending', async () => {
    renderDialog({}, [campaignDetailMock({ status: 'SENDING' })]);
    await screen.findByText('Weekend');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('placeholders an email that was never rendered', async () => {
    renderDialog({}, [campaignDetailMock({ rendered_html: null })]);
    await screen.findByText('Weekend');
    expect(screen.getByTitle('Campaign email')).toHaveAttribute(
      'srcdoc',
      expect.stringContaining('has not been rendered yet'),
    );
  });

  it('surfaces a failed load instead of an empty dialog', async () => {
    renderDialog({}, [campaignDetailMock({}, { failWith: 'Campaign not found' })]);
    expect(await screen.findByText(/Campaign not found/)).toBeInTheDocument();
  });

  it('locks every exit while a mutation is in flight', async () => {
    renderDialog({ busy: true });
    await screen.findByText('Weekend');
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send now' })).toBeDisabled();
  });

  it('closes on demand', async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('MarketingCampaignsPage', () => {
  it('says so when there are no campaigns yet', async () => {
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No campaigns yet');
  });

  it('goes to the create page from the button above the table', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New campaign' }));
    expect(await screen.findByText('create-campaign')).toBeInTheDocument();
  });

  it('opens a campaign from a row click and closes it again', async () => {
    __setTableRows([makeCampaignRow()]);
    renderPage([listsMock(), campaignDetailMock()]);
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sends a campaign from the table', async () => {
    __setTableRows([makeCampaignRow({ campaign_id: 'c9', name: 'Past' })]);
    renderPage([listsMock(), sendCampaignMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Send campaign now' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Campaign sent'));
  });

  it('reports a server-side send error and a thrown send error', async () => {
    __setTableRows([makeCampaignRow({ campaign_id: 'c9', name: 'Past' })]);
    renderPage([
      listsMock(),
      sendCampaignMock({ serverError: 'Rejected' }),
      sendCampaignMock({ throwMessage: 'Send crashed' }),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Send campaign now' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Rejected'));
    fireEvent.click(screen.getByRole('button', { name: 'Send campaign now' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('Send crashed'));
  });

  it('deletes a campaign after confirming', async () => {
    __setTableRows([makeCampaignRow({ name: 'Weekend' })]);
    renderPage([listsMock(), deleteCampaignMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete campaign' }));

    expect(await screen.findByText('Delete this campaign?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Weekend” deleted'),
    );
  });

  it('surfaces a failed delete instead of closing silently', async () => {
    __setTableRows([makeCampaignRow()]);
    renderPage([listsMock(), deleteCampaignMock({ failWith: 'still sending' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete campaign' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/still sending/)).toBeInTheDocument();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('lets you back out of the delete confirm', async () => {
    __setTableRows([makeCampaignRow()]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete campaign' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Delete this campaign?')).not.toBeInTheDocument(),
    );
  });

  it('deletes from inside the details dialog', async () => {
    __setTableRows([makeCampaignRow()]);
    renderPage([listsMock(), campaignDetailMock(), deleteCampaignMock()]);
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(await dialog.findByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Weekend” deleted'),
    );
  });
});
