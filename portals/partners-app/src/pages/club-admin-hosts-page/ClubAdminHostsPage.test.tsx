import '../../../__tests__/helpers/agGridEnv';
import '../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminHostsPage from './ClubAdminHostsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const host = (over: Record<string, unknown> = {}) => ({
  __typename: 'ClubHostRow',
  user_id: 'host-1',
  name: 'Meera Nair',
  photo_url: null,
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
  email: 'meera@example.com',
  last_pod_at: '2026-11-18T12:30:00.000Z',
  completed_this_month: 6,
  upcoming_count: 2,
  monthly_target: 8,
  score: 75,
  is_inactive: false,
  engagement_status_key: 'ACTIVE',
  engagement_status_label: 'Active',
  ...over,
});

const quiet = host({
  user_id: 'host-2',
  name: 'Ravi Kumar',
  phone: null,
  whatsapp: null,
  email: 'ravi@example.com',
  last_pod_at: null,
  completed_this_month: 0,
  upcoming_count: 0,
  score: 0,
  is_inactive: true,
  engagement_status_key: 'NOT_CONTACTED',
  engagement_status_label: 'Not Contacted',
});

const summary = (over: Record<string, unknown> = {}) => ({
  __typename: 'ClubHostsSummary',
  club_id: 'club-1',
  club_name: 'Sunrise Tennis Club',
  host_count: 2,
  inactive_count: 1,
  inactivity_days: 14,
  monthly_pod_target: 8,
  ...over,
});

const mount = (rows: readonly unknown[], summaryOver: Record<string, unknown> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<ClubAdminHostsPage />, {
    route: '/club-admin/clubs/club-1/hosts',
    path: '/club-admin/clubs/:clubId/hosts',
    link: scriptedLink(
      {
        ClubAdminClubHostsSummary: { clubAdminClubHostsSummary: summary(summaryOver) },
        ClubAdminClubHostsTable: {
          clubAdminClubHostsTable: { __typename: 'ClubHostTablePage', total: rows.length, rows },
        },
      },
      sent,
    ),
  });

const rowOf = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

describe('ClubAdminHostsPage', () => {
  it('heads the page with the club and warns about the hosts who went quiet', async () => {
    mount([host(), quiet]);

    expect(await screen.findByRole('heading', { name: 'Sunrise Tennis Club' })).toBeTruthy();
    const alert = await screen.findByTestId('club-hosts-inactive-alert');
    expect(alert.textContent).toContain('1 host has not run a pod in the last 14 days');
    expect(alert.textContent).toContain('Call or message them');
  });

  it('shows each host’s contacts, month and score, and marks the inactive one', async () => {
    mount([host(), quiet]);

    const meera = rowOf(await screen.findByText('Meera Nair'));
    expect(within(meera).getByText('6 / 8')).toBeTruthy();
    expect(within(meera).getByText('75%')).toBeTruthy();
    expect(within(meera).getByTestId('club-host-contact-host-1-phone').getAttribute('href')).toBe('tel:+919876543210');
    expect(within(meera).queryByText('Inactive')).toBeNull();

    const ravi = rowOf(screen.getByText('Ravi Kumar'));
    expect(within(ravi).getByText('Inactive')).toBeTruthy();
    expect(within(ravi).getByText('No pod yet')).toBeTruthy();
    expect(within(ravi).getByText('Not Contacted')).toBeTruthy();
    expect(within(ravi).queryByTestId('club-host-contact-host-2-phone')).toBeNull();
  });

  it('asks for this club only', async () => {
    const sent: SentOperation[] = [];
    mount([host()], {}, sent);
    await screen.findByText('Meera Nair');
    const table = sent.find((op) => op.name === 'ClubAdminClubHostsTable');
    expect(table?.variables.club_id).toBe('club-1');
  });

  it('opens a host’s page from the row', async () => {
    mount([host()]);
    fireEvent.click(await screen.findByText('Meera Nair'));
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club-1/hosts/host-1'),
    );
  });

  it('counts several quiet hosts in the plural', async () => {
    mount([host(), quiet], { inactive_count: 3, host_count: 5 });
    expect((await screen.findByTestId('club-hosts-inactive-alert')).textContent).toContain(
      '3 hosts have not run a pod in the last 14 days',
    );
  });

  it('says every host is active when none is quiet', async () => {
    mount([host()], { host_count: 1, inactive_count: 0 });
    expect((await screen.findByTestId('club-hosts-all-active')).textContent).toBe(
      'Every host has run a pod in the last 14 days.',
    );
  });

  it('says so when the club has no hosts, without a warning', async () => {
    mount([], { host_count: 0, inactive_count: 0 });
    expect(await screen.findByText('No one hosts pods in this club yet.')).toBeTruthy();
    expect(screen.queryByTestId('club-hosts-inactive-alert')).toBeNull();
  });

  it('shows the server’s refusal for a club the caller does not administer', async () => {
    renderWithProviders(<ClubAdminHostsPage />, {
      route: '/club-admin/clubs/club-9/hosts',
      path: '/club-admin/clubs/:clubId/hosts',
      link: scriptedLink({
        ClubAdminClubHostsSummary: new Error('You do not administer this club'),
        ClubAdminClubHostsTable: new Error('You do not administer this club'),
      }),
    });
    expect((await screen.findAllByText('You do not administer this club')).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('club-hosts-inactive-alert')).toBeNull();
  });
});
