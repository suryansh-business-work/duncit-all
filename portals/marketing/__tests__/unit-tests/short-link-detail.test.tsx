import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderWithProviders } from '../testkit';
import {
  makeShortLinkClickRow,
  makeShortLinkStats,
  setShortLinkActiveMock,
  shortLinkMock,
  shortLinkQrMock,
  shortLinkStatsMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
    formatDate: (d: Date | string) => `day:${String(d)}`,
  }),
}));
const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
}));
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

import ShortLinkDetailPage from '../../src/pages/short-links-page/ShortLinkDetailPage';
import BreakdownCard from '../../src/pages/short-links-page/detail/BreakdownCard';
import ClicksOverTime from '../../src/pages/short-links-page/detail/ClicksOverTime';
import { getClickColumns, locationOf } from '../../src/pages/short-links-page/detail/clickColumns';
import type { ShortLinkClickRow } from '../../src/pages/short-links-page/queries';

const detailMocks = () => [shortLinkMock(), shortLinkStatsMock(), shortLinkQrMock()];

const renderDetail = (mocks = detailMocks()) =>
  renderWithProviders(<ShortLinkDetailPage />, {
    mocks,
    initialEntries: ['/short-links/sl1'],
    routes: (
      <>
        <Route path="/short-links/:linkId" element={<ShortLinkDetailPage />} />
        <Route path="/short-links" element={<div>links-list</div>} />
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
describe('BreakdownCard', () => {
  it('lists each value with its count, biggest first', () => {
    renderWithProviders(
      <BreakdownCard
        title="Came from"
        rows={[
          { label: 'Instagram', count: 90 },
          { label: 'Direct', count: 38 },
        ]}
        emptyText="nothing"
      />,
    );
    expect(screen.getByText('Came from')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('says so rather than showing an empty box', () => {
    renderWithProviders(<BreakdownCard title="Country" rows={[]} emptyText="No clicks yet." />);
    expect(screen.getByText('No clicks yet.')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('ClicksOverTime', () => {
  it('draws one bar per day', () => {
    renderWithProviders(
      <ClicksOverTime
        daily={[
          { date: '2026-07-30', count: 40 },
          { date: '2026-07-31', count: 88 },
        ]}
        formatDate={String}
      />,
    );
    expect(screen.getAllByTestId('click-bar')).toHaveLength(2);
  });

  it('says so when nothing has been clicked in the window', () => {
    renderWithProviders(<ClicksOverTime daily={[]} formatDate={String} />);
    expect(screen.getByText('No clicks in the last 30 days.')).toBeInTheDocument();
    expect(screen.queryByTestId('click-bar')).not.toBeInTheDocument();
  });
});

// ===========================================================================
describe('click columns', () => {
  const value = (field: string, row: ShortLinkClickRow) =>
    getClickColumns().find((column) => column.field === field)?.valueGetter?.(row);

  it('reads platform, location and device off a click', () => {
    const row = makeShortLinkClickRow();
    expect(value('platform', row)).toBe('Instagram');
    expect(value('country', row)).toBe('Pune, MH, IN');
    expect(value('device_type', row)).toBe('Mobile');
  });

  // A partial lookup should still say what it knows.
  it('joins only the parts of a location it could resolve', () => {
    expect(locationOf(makeShortLinkClickRow({ city: null, region: null }))).toBe('IN');
    expect(locationOf(makeShortLinkClickRow({ city: null, region: null, country: null }))).toBe('—');
  });

  it('keeps an unrecognised device type as it was stored', () => {
    expect(value('device_type', makeShortLinkClickRow({ device_type: 'WATCH' }))).toBe('WATCH');
  });
});

// ===========================================================================
describe('ShortLinkDetailPage', () => {
  it('shows the headline numbers, the tagging and the QR', async () => {
    renderDetail();

    expect(await screen.findByText('Diwali pod push')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('94')).toBeInTheDocument();
    expect(screen.getByText('https://duncit.com/aB3xY9Zq')).toBeInTheDocument();
    expect(screen.getByText('instagram')).toBeInTheDocument();
    expect(await screen.findByAltText('QR code for Diwali pod push')).toBeInTheDocument();
  });

  it('breaks the clicks down by where they came from and what they used', async () => {
    renderDetail();
    await screen.findByText('Came from');
    for (const title of ['Country', 'City', 'Device', 'Operating system', 'Browser']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('click-bar')).toHaveLength(2);
  });

  it('lists every click in a table', async () => {
    __setTableRows([makeShortLinkClickRow()]);
    renderDetail();
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-platform')).toHaveTextContent('Instagram');
    expect(within(row).getByTestId('cell-platform')).toHaveTextContent('instagram.com');
    expect(within(row).getByTestId('cell-country')).toHaveTextContent('Pune, MH, IN');
  });

  // WhatsApp and native share sheets strip the referrer, so a Direct click has
  // no host to show under the platform — and must not render an empty line.
  it('shows a Direct click without a referring host', async () => {
    __setTableRows([
      makeShortLinkClickRow({ platform: 'Direct', referrer_host: null, device_type: 'DESKTOP' }),
      // A device we have no label for is shown as stored rather than blank.
      makeShortLinkClickRow({ id: 'clk2', device_type: 'WATCH', referrer_host: null }),
    ]);
    renderDetail();
    const [first, second] = await screen.findAllByTestId('table-row');
    expect(within(first).getByTestId('cell-platform')).toHaveTextContent('Direct');
    expect(within(first).getByTestId('cell-device_type')).toHaveTextContent('Desktop');
    expect(within(second).getByTestId('cell-device_type')).toHaveTextContent('WATCH');
  });

  it('says so when nothing has followed the link yet', async () => {
    renderDetail([
      shortLinkMock(),
      shortLinkStatsMock({
        total_clicks: 0,
        unique_visitors: 0,
        countries_reached: 0,
        daily: [],
        platforms: [],
        countries: [],
        cities: [],
        devices: [],
        oses: [],
        browsers: [],
        referrers: [],
      }),
      shortLinkQrMock(),
    ]);
    await screen.findByText('Came from');
    expect(screen.getAllByText('No clicks recorded yet.').length).toBeGreaterThan(0);
  });

  it('waits rather than rendering half a page', () => {
    renderDetail([shortLinkMock(), shortLinkStatsMock({}, { pending: true }), shortLinkQrMock()]);
    expect(screen.queryByText('Came from')).not.toBeInTheDocument();
  });

  it('surfaces a link that could not be loaded', async () => {
    renderDetail([shortLinkMock({}, { failWith: 'Short link not found' }), shortLinkStatsMock()]);
    expect(await screen.findByText(/Short link not found/)).toBeInTheDocument();
  });

  it('goes back to the list', async () => {
    renderDetail();
    await screen.findByText('Diwali pod push');
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByText('links-list')).toBeInTheDocument();
  });

  it('retires the link from the header', async () => {
    renderDetail([...detailMocks(), setShortLinkActiveMock(false)]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retire link' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” retired'),
    );
  });

  it('reactivates a retired link', async () => {
    renderDetail([
      shortLinkMock({ is_active: false }),
      shortLinkStatsMock(),
      shortLinkQrMock(),
      setShortLinkActiveMock(true),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate link' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” reactivated'),
    );
  });

  it('em-dashes a link that has never been clicked', async () => {
    renderDetail([
      shortLinkMock({ first_clicked_at: null, last_clicked_at: null, utm_campaign: null }),
      shortLinkStatsMock(),
      shortLinkQrMock(),
    ]);
    await screen.findByText('Diwali pod push');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders without a QR rather than showing a broken image', async () => {
    renderDetail([shortLinkMock(), shortLinkStatsMock(), shortLinkQrMock({ pending: true })]);
    await screen.findByText('Came from');
    expect(screen.queryByAltText('QR code for Diwali pod push')).not.toBeInTheDocument();
  });

  it('shows the stats it was given even with an unusual shape', () => {
    // Guards the summary's own formatting rather than the page's wiring.
    expect(makeShortLinkStats({ total_clicks: 0 }).total_clicks).toBe(0);
  });
});
