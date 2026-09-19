import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminDashboardPage from './ClubAdminDashboardPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type SentOperation } from '../../__tests__/groupC-link';

vi.mock('@duncit/dashboard', () => import('../../__tests__/dashboard-mock'));

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const kpis = {
  __typename: 'ClubAdminKpis',
  assigned_clubs: 2,
  total_pods: 14,
  upcoming_pods: 3,
  completed_pods: 9,
  total_bookings: 61,
  backed_out: 2,
  total_attendees: 58,
  total_spots: 80,
  fill_rate: 72.5,
  total_followers: 240,
  new_followers: 12,
  avg_rating: 4.6,
  ratings_count: 31,
  active_hosts: 4,
  total_revenue: 30440,
  currency_symbol: '₹',
};

/** Followers flat at zero all year — a line with no height of its own. */
const trend = [
  { __typename: 'ClubAdminTrendPoint', label: 'Aug', pods: 2, bookings: 9, followers: 0, revenue: 4491 },
  { __typename: 'ClubAdminTrendPoint', label: 'Sep', pods: 4, bookings: 17, followers: 0, revenue: 8483 },
];

const dashboard = {
  clubAdminDashboard: {
    __typename: 'ClubAdminDashboard',
    kpis,
    trend,
    clubs: [],
    categories: [
      {
        __typename: 'ClubAdminCategory',
        category_id: 'cat-tennis',
        name: 'Tennis',
        super_category: 'Sports',
        clubs: 2,
        pods: 14,
      },
    ],
  },
};

const clubRow = {
  __typename: 'ClubAdminClubRow',
  club_id: 'club-1',
  club_slug: 'sunrise-tennis',
  club_name: 'Sunrise Tennis Club',
  total_pods: 14,
  upcoming_pods: 3,
  completed_pods: 9,
  followers: 240,
  rating: 4.6,
  revenue: 30440,
};

const mount = (sent: SentOperation[]) =>
  renderWithProviders(<ClubAdminDashboardPage />, {
    link: scriptedLink(
      {
        ClubAdminDashboard: dashboard,
        ClubAdminDashboardTable: {
          clubAdminDashboardTable: { __typename: 'ClubAdminClubRowTablePage', total: 1, rows: [clubRow] },
        },
      },
      sent,
    ),
  });

const count = (sent: SentOperation[], name: string) => sent.filter((op) => op.name === name).length;

describe('ClubAdminDashboardPage', () => {
  it('draws the monthly trend, including a series that stayed at zero', async () => {
    mount([]);

    expect(screen.getByRole('heading', { name: 'Club Admin Dashboard' })).toBeTruthy();
    const trendWidget = screen.getByTestId('widget-trend');
    const chart = await within(trendWidget).findByRole('img', { name: 'Monthly trend chart' });
    const lines = chart.querySelectorAll('polyline');
    expect(lines).toHaveLength(4);
    // A flat zero series sits on the baseline instead of dividing by zero.
    const flat = [...lines].map((line) => line.getAttribute('points')).find((points) => points === '0.0,192.0 640.0,192.0');
    expect(flat).toBeTruthy();
    expect(within(trendWidget).getByText('Aug')).toBeTruthy();
    expect(within(trendWidget).getByText('Sep')).toBeTruthy();
    expect(await screen.findByText('Sunrise Tennis Club')).toBeTruthy();
  });

  it('reloads the figures and the per-club table for a newly picked range', async () => {
    const sent: SentOperation[] = [];
    mount(sent);
    await screen.findByText('Sunrise Tennis Club');
    const firstFrom = sent.find((op) => op.name === 'ClubAdminDashboard')?.variables.from;
    expect(typeof firstFrom).toBe('string');
    const tableLoads = count(sent, 'ClubAdminDashboardTable');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Range/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'All time' }));

    await waitFor(() => expect(count(sent, 'ClubAdminDashboardTable')).toBeGreaterThan(tableLoads));
    const lastDashboard = sent.filter((op) => op.name === 'ClubAdminDashboard').at(-1);
    expect(lastDashboard?.variables).toEqual({ from: null, to: null });
    const lastTable = sent.filter((op) => op.name === 'ClubAdminDashboardTable').at(-1);
    expect(lastTable?.variables.from).toBeNull();
  });
});
