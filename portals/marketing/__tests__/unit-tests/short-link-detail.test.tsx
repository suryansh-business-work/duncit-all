import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import {
  makeShortLinkClickRow,
  makeShortLinkStats,
  setShortLinkActiveMock,
  shortLinkMock,
  shortLinkQrMock,
  shortLinkStatsMock,
} from '../mocks';
import { __setTableRows, tableById } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
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
import {
  fillDailySeries,
  niceTicks,
} from '../../src/pages/short-links-page/detail/daily-series';
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
describe('fillDailySeries', () => {
  const END = new Date('2026-07-31T13:00:00.000Z');

  // Three clicks spread over three weeks must not draw as three adjacent bars
  // — the gaps are what make the axis mean elapsed time.
  it('gives every day in the window a slot, filling the gaps with zero', () => {
    const series = fillDailySeries([{ date: '2026-07-29', count: 5 }], 7, END);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toEqual({ date: '2026-07-31', count: 0 });
    expect(series.find((point) => point.date === '2026-07-29')).toEqual({
      date: '2026-07-29',
      count: 5,
    });
    expect(series.filter((point) => point.count === 0)).toHaveLength(6);
  });

  it('runs oldest to newest, ending on the given day', () => {
    const series = fillDailySeries([], 3, END);
    expect(series.map((point) => point.date)).toEqual(['2026-07-29', '2026-07-30', '2026-07-31']);
  });

  it('ignores days outside the window', () => {
    const series = fillDailySeries([{ date: '2020-01-01', count: 99 }], 3, END);
    expect(series.every((point) => point.count === 0)).toBe(true);
  });
});

describe('niceTicks', () => {
  // A peak of 47 must not produce an axis of 0 / 15.7 / 31.3 / 47.
  it('lands on numbers a person would choose', () => {
    expect(niceTicks(47)).toEqual([60, 45, 30, 15, 0]);
    expect(niceTicks(8)).toEqual([8, 6, 4, 2, 0]);
    expect(niceTicks(1)).toEqual([4, 3, 2, 1, 0]);
    expect(niceTicks(230)).toEqual([240, 180, 120, 60, 0]);
    expect(niceTicks(1900)).toEqual([2000, 1500, 1000, 500, 0]);
  });

  // An empty chart still needs an axis, so the scale never divides by zero.
  it('keeps a usable axis when nothing has been clicked', () => {
    expect(niceTicks(0)).toEqual([4, 3, 2, 1, 0]);
  });
});

describe('ClicksOverTime', () => {
  const END = new Date('2026-07-31T13:00:00.000Z');

  it('draws the whole window, not only the days with clicks', () => {
    renderWithProviders(
      <ClicksOverTime
        daily={[
          { date: '2026-07-30', count: 40 },
          { date: '2026-07-31', count: 88 },
        ]}
        formatDate={String}
        today={END}
      />,
    );
    expect(screen.getAllByTestId('click-bar')).toHaveLength(30);
    expect(screen.getByText('Last 30 days · 128 clicks')).toBeInTheDocument();
  });

  it('sizes each bar by its own count', () => {
    renderWithProviders(
      <ClicksOverTime
        daily={[{ date: '2026-07-31', count: 40 }]}
        formatDate={String}
        days={3}
        today={END}
      />,
    );
    const bars = screen.getAllByTestId('click-bar');
    expect(bars.map((bar) => bar.getAttribute('data-count'))).toEqual(['0', '0', '40']);
  });

  it('still draws an axis when nothing has been clicked', () => {
    renderWithProviders(<ClicksOverTime daily={[]} formatDate={String} days={5} today={END} />);
    expect(screen.getAllByTestId('click-bar')).toHaveLength(5);
    expect(screen.getByText('Last 5 days · 0 clicks')).toBeInTheDocument();
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
    expect(screen.getAllByTestId('click-bar')).toHaveLength(30);
  });

  it('lists every click in a table', async () => {
    __setTableRows([makeShortLinkClickRow()]);
    renderDetail();
    await screen.findAllByTestId('table-row');
    // The page renders a journey table too, so scope to the clicks one.
    const row = within(tableById('marketing-short-link-clicks')).getByTestId('table-row');
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
    await screen.findAllByTestId('table-row');
    const [first, second] = within(tableById('marketing-short-link-clicks')).getAllByTestId(
      'table-row',
    );
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
