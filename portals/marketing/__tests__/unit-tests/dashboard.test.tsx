import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { makeMarketingDashboard, marketingDashboardMock } from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({
    formatDate: (d: Date | string) => `day:${String(d)}`,
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
  }),
}));

import DashboardPage from '../../src/pages/dashboard-page/DashboardPage';
import KpiCard from '../../src/pages/dashboard-page/KpiCard';
import TopLinksCard from '../../src/pages/dashboard-page/TopLinksCard';
import CampaignPerformanceCard from '../../src/pages/dashboard-page/CampaignPerformanceCard';

const renderDashboard = (mocks = [marketingDashboardMock()]) =>
  renderWithProviders(<DashboardPage />, {
    mocks,
    initialEntries: ['/'],
    routes: (
      <>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/short-links" element={<div>short-links-page</div>} />
        <Route path="/short-links/:linkId" element={<div>link-detail</div>} />
        <Route path="/campaigns/email" element={<div>campaigns-page</div>} />
        <Route path="/ads-approvals" element={<div>ads-approvals</div>} />
        <Route path="/live-ads" element={<div>live-ads</div>} />
        <Route path="/social/accounts" element={<div>accounts-page</div>} />
        <Route path="/publish/calendar" element={<div>calendar-page</div>} />
        <Route path="/leads/instagram" element={<div>leads-page</div>} />
      </>
    ),
  });

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('KpiCard', () => {
  it('shows the number with its context line', () => {
    renderWithProviders(
      <KpiCard label="Link clicks" value="1,280" hint="940 unique visitors" icon={<span />} />,
    );
    expect(screen.getByText('Link clicks')).toBeInTheDocument();
    expect(screen.getByText('1,280')).toBeInTheDocument();
    expect(screen.getByText('940 unique visitors')).toBeInTheDocument();
  });

  it('is a plain card when there is nowhere to go, and a button when there is', () => {
    const { unmount } = renderWithProviders(<KpiCard label="A" value="1" icon={<span />} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();

    const onOpen = vi.fn();
    renderWithProviders(<KpiCard label="A" value="1" icon={<span />} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('TopLinksCard', () => {
  const links = makeMarketingDashboard().links.top;

  it('ranks the links and shows revenue only where there is some', () => {
    renderWithProviders(<TopLinksCard links={links} onOpen={vi.fn()} />);
    const rows = screen.getAllByTestId('top-link');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Diwali pod push')).toBeInTheDocument();
    expect(within(rows[0]).getByText('₹45,000')).toBeInTheDocument();
    // The second link earned nothing — no revenue chip at all.
    expect(within(rows[1]).queryByText('₹0')).not.toBeInTheDocument();
  });

  it('opens a link by click and by keyboard', () => {
    const onOpen = vi.fn();
    renderWithProviders(<TopLinksCard links={links} onOpen={onOpen} />);
    const [first, second] = screen.getAllByTestId('top-link');
    fireEvent.click(first);
    fireEvent.keyDown(second, { key: 'Enter' });
    fireEvent.keyDown(second, { key: ' ' });
    // Ignores keys that are not activation.
    fireEvent.keyDown(second, { key: 'a' });
    expect(onOpen).toHaveBeenCalledTimes(3);
  });

  it('says so when no link has been followed', () => {
    renderWithProviders(<TopLinksCard links={[]} onOpen={vi.fn()} />);
    expect(screen.getByText('No link has been followed yet.')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('CampaignPerformanceCard', () => {
  const campaigns = makeMarketingDashboard().campaigns.recent;

  it('ranks by open rate and shows what it is a rate of', () => {
    renderWithProviders(
      <CampaignPerformanceCard campaigns={campaigns} formatDate={String} onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Badminton Launch')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    // Rate alone is misleading without the denominator.
    expect(screen.getByText(/1,200 of 4,000 opened/)).toBeInTheDocument();
  });

  it('em-dashes a campaign with no sent date', () => {
    renderWithProviders(
      <CampaignPerformanceCard
        campaigns={[{ ...campaigns[0], sent_at: null }]}
        formatDate={String}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it('says so when nothing has been sent, and links onward', () => {
    const onOpen = vi.fn();
    renderWithProviders(
      <CampaignPerformanceCard campaigns={[]} formatDate={String} onOpen={onOpen} />,
    );
    expect(screen.getByText('Nothing has been sent yet.')).toBeInTheDocument();
    const viewAll = screen.getByText('View all');
    fireEvent.click(viewAll);
    fireEvent.keyDown(viewAll, { key: 'Enter' });
    fireEvent.keyDown(viewAll, { key: ' ' });
    fireEvent.keyDown(viewAll, { key: 'a' });
    expect(onOpen).toHaveBeenCalledTimes(3);
  });
});

// ===========================================================================
describe('DashboardPage', () => {
  it('shows the headline numbers with what they are a share of', async () => {
    renderDashboard();
    expect(await screen.findByText('1,280')).toBeInTheDocument();
    expect(screen.getByText('940 unique visitors')).toBeInTheDocument();
    expect(screen.getByText('₹63,000')).toBeInTheDocument();
    expect(screen.getByText('42 paid · 3.3% of clicks')).toBeInTheDocument();
    expect(screen.getByText('8,400')).toBeInTheDocument();
    expect(screen.getByText('6 campaigns · 25% opened')).toBeInTheDocument();
  });

  it('draws the clicks chart over the reported window', async () => {
    renderDashboard();
    await screen.findByText('Clicks over time');
    expect(screen.getAllByTestId('click-bar')).toHaveLength(30);
  });

  it('breaks the traffic down and lists what is set up', async () => {
    renderDashboard();
    expect(await screen.findByText('Where clicks came from')).toBeInTheDocument();
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('Active short links')).toBeInTheDocument();
    expect(screen.getByText('Saved audience lists')).toBeInTheDocument();
  });

  it('opens a busiest link straight into its detail page', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('Diwali pod push'));
    expect(await screen.findByText('link-detail')).toBeInTheDocument();
  });

  it('sends the ads card to approvals while work is waiting', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('2 waiting for approval'));
    expect(await screen.findByText('ads-approvals')).toBeInTheDocument();
  });

  // Nothing pending means the useful destination is the live list instead.
  it('sends the ads card to the live list when nothing is waiting', async () => {
    renderDashboard([marketingDashboardMock({ ads: { live: 3, pending: 0 } })]);
    fireEvent.click(await screen.findByText('Nothing waiting for approval'));
    expect(await screen.findByText('live-ads')).toBeInTheDocument();
  });

  it('opens short links and campaigns from their cards', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('Link clicks'));
    expect(await screen.findByText('short-links-page')).toBeInTheDocument();
  });

  it('opens campaigns from the recent list', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('View all'));
    expect(await screen.findByText('campaigns-page')).toBeInTheDocument();
  });

  it('waits rather than rendering half a dashboard', () => {
    renderDashboard([marketingDashboardMock({}, { pending: true })]);
    expect(screen.queryByText('Clicks over time')).not.toBeInTheDocument();
  });

  it('surfaces a dashboard that could not be loaded', async () => {
    renderDashboard([marketingDashboardMock({}, { failWith: 'Access Denied' })]);
    expect(await screen.findByText(/Access Denied/)).toBeInTheDocument();
  });
  it('shows what social, publishing and the lead search did', async () => {
    renderDashboard();
    expect(await screen.findByText('5,600')).toBeInTheDocument();
    expect(screen.getByText('24 posts · 41,000 views')).toBeInTheDocument();
    expect(screen.getByText('1 need attention')).toBeInTheDocument();
    expect(screen.getByText('4 scheduled · 1 failed')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
    expect(screen.getByText('12 scored 70 or more')).toBeInTheDocument();
  });

  it('says every account is healthy when none needs a look', async () => {
    renderDashboard([marketingDashboardMock({ social: { ...makeMarketingDashboard().social, attention: 0 } })]);
    expect(await screen.findByText('Every account is healthy')).toBeInTheDocument();
  });

  it('breaks engagement down by network and leads by stage, and prices the automation', async () => {
    renderDashboard();
    expect(await screen.findByText('Engagement by network')).toBeInTheDocument();
    // Instagram is both a click source and a network; the codes became labels.
    expect(screen.getAllByText('Instagram')).toHaveLength(2);
    expect(screen.getByText('Threads')).toBeInTheDocument();
    expect(screen.getByText('Leads by stage')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText('Automation · $412.00 AI spend')).toBeInTheDocument();
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    // A state with nothing in it draws no bar.
    expect(screen.queryByText('Running now')).not.toBeInTheDocument();
  });

  it('says so when nothing has been synced, found or run yet', async () => {
    const empty = makeMarketingDashboard();
    renderDashboard([
      marketingDashboardMock({
        social: { ...empty.social, by_platform: [] },
        leads: { ...empty.leads, by_status: [] },
        runs: { awaiting_approval: 0, running: 0, completed: 0, failed: 0, spend: 0 },
      }),
    ]);
    expect(await screen.findByText('No engagement recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('No leads found yet.')).toBeInTheDocument();
    expect(screen.getByText('Nothing has run yet.')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
  });

  it('opens the accounts page from the connected-accounts tile', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('Connected accounts'));
    expect(await screen.findByText('accounts-page')).toBeInTheDocument();
  });

  it('opens the calendar from the published-posts tile', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('Posts published'));
    expect(await screen.findByText('calendar-page')).toBeInTheDocument();
  });

  it('opens the lead search from the leads tile', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('Leads found'));
    expect(await screen.findByText('leads-page')).toBeInTheDocument();
  });
});
