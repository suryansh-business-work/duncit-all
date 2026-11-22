import '../../../__tests__/helpers/agGridEnv';
import '../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminHostDetailPage from './ClubAdminHostDetailPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const STATUSES = [
  { __typename: 'HostEngagementStatus', key: 'NOT_CONTACTED', label: 'Not Contacted', is_active: true },
  { __typename: 'HostEngagementStatus', key: 'CONTACTED', label: 'Contacted', is_active: true },
  { __typename: 'HostEngagementStatus', key: 'PARKED', label: 'Parked', is_active: false },
];

const detail = (over: Record<string, unknown> = {}) => ({
  __typename: 'ClubHostDetail',
  user_id: 'host-1',
  club_id: 'club-1',
  club_name: 'Sunrise Tennis Club',
  name: 'Ravi Kumar',
  photo_url: null,
  phone: '+91 98765 43210',
  whatsapp: '+91 98765-43211',
  email: 'ravi@example.com',
  last_pod_at: '2026-10-01T12:30:00.000Z',
  days_since_last_pod: 52,
  completed_this_month: 2,
  upcoming_count: 0,
  monthly_target: 8,
  score: 25,
  is_inactive: true,
  inactivity_days: 14,
  engagement_status_key: 'NOT_CONTACTED',
  engagement_status_label: 'Not Contacted',
  engagement_note: null,
  engagement_updated_at: null,
  statuses: STATUSES,
  score_history: [{ __typename: 'HostScorePoint', period: '2026-10', completed: 4, target: 8, score: 50 }],
  ...over,
});

const podsPage = { clubAdminPodsTable: { __typename: 'PodTablePage', total: 0, rows: [] } };

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = [], search = '') =>
  renderWithProviders(<ClubAdminHostDetailPage />, {
    route: `/club-admin/clubs/club-1/hosts/host-1${search}`,
    path: '/club-admin/clubs/:clubId/hosts/:userId',
    link: scriptedLink(
      {
        ClubHostVenueNames: { publicVenues: [] },
        ClubAdminHostPodsTable: podsPage,
        ...answers,
      },
      sent,
    ),
  });

describe('ClubAdminHostDetailPage', () => {
  it('warns about an inactive host with call, WhatsApp and email buttons that dial', async () => {
    mount({ ClubAdminHostDetail: { clubAdminHostDetail: detail() } });

    expect(await screen.findByRole('heading', { name: 'Ravi Kumar' })).toBeTruthy();
    const warning = screen.getByTestId('club-host-inactive-warning');
    expect(warning.textContent).toContain('Ravi Kumar has not run a pod in the last 14 days');
    expect(warning.textContent).toContain('help them conduct more pods');
    expect(within(warning).getByTestId('club-host-reach-phone').getAttribute('href')).toBe('tel:+919876543210');
    expect(within(warning).getByTestId('club-host-reach-whatsapp').getAttribute('href')).toBe('https://wa.me/919876543211');
    expect(within(warning).getByTestId('club-host-reach-email').getAttribute('href')).toBe('mailto:ravi@example.com');
  });

  it('shows the month’s score and the snapshotted months', async () => {
    mount({ ClubAdminHostDetail: { clubAdminHostDetail: detail() } });

    const score = await screen.findByTestId('club-host-score');
    expect(within(score).getByText('25%')).toBeTruthy();
    expect(within(score).getByText('2 of 8 pods completed')).toBeTruthy();
    expect(within(score).getByTestId('club-host-history-2026-10').textContent).toContain('50%');
  });

  it('shows no warning for an active host and a plain note for a host with no contacts', async () => {
    mount({
      ClubAdminHostDetail: {
        clubAdminHostDetail: detail({ is_inactive: false, phone: null, whatsapp: null, email: null, score_history: [] }),
      },
    });
    await screen.findByRole('heading', { name: 'Ravi Kumar' });
    expect(screen.queryByTestId('club-host-inactive-warning')).toBeNull();
    expect(screen.getByText('This host has not added a phone, WhatsApp number or email yet.')).toBeTruthy();
    expect(screen.getByText('Monthly scores appear here once a month has been calculated.')).toBeTruthy();
  });

  it('saves a new engagement status with a note for this club and host', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        ClubAdminHostDetail: { clubAdminHostDetail: detail() },
        SetClubHostEngagement: {
          setClubHostEngagement: {
            __typename: 'ClubHostEngagementResult',
            host_user_id: 'host-1',
            status_key: 'CONTACTED',
            status_label: 'Contacted',
            note: 'Busy with exams',
            updated_at: '2026-11-22T10:00:00.000Z',
          },
        },
      },
      sent,
    );

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Status' }));
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Not Contacted', 'Contacted']); // the switched-off status is not offered
    fireEvent.click(screen.getByRole('option', { name: 'Contacted' }));
    fireEvent.change(screen.getByTestId('club-host-engagement-note'), { target: { value: 'Busy with exams' } });
    fireEvent.click(screen.getByTestId('club-host-engagement-save'));

    expect(await screen.findByText('Engagement status saved.')).toBeTruthy();
    const save = sent.find((op) => op.name === 'SetClubHostEngagement');
    expect(save?.variables).toEqual({
      club_id: 'club-1',
      host_user_id: 'host-1',
      status_key: 'CONTACTED',
      note: 'Busy with exams',
    });
  });

  it('shows the server’s refusal of a status change', async () => {
    mount({
      ClubAdminHostDetail: { clubAdminHostDetail: detail() },
      SetClubHostEngagement: new Error('Pick one of the active engagement statuses.'),
    });
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Contacted' }));
    fireEvent.click(screen.getByTestId('club-host-engagement-save'));
    expect(await screen.findByText('Pick one of the active engagement statuses.')).toBeTruthy();
  });

  it('lists upcoming pods first and past pods from the Past tab, pinned to this host', async () => {
    const sent: SentOperation[] = [];
    mount({ ClubAdminHostDetail: { clubAdminHostDetail: detail() } }, sent);
    await screen.findByRole('heading', { name: 'Ravi Kumar' });
    await waitFor(() => expect(sent.some((op) => op.name === 'ClubAdminHostPodsTable')).toBe(true));
    const first = sent.find((op) => op.name === 'ClubAdminHostPodsTable');
    expect(first?.variables).toMatchObject({ club_id: 'club-1', lifecycle: 'UPCOMING' });
    expect(JSON.stringify(first?.variables)).toContain('host-1');

    fireEvent.click(screen.getByTestId('club-host-tab-past'));
    await waitFor(() =>
      expect(sent.some((op) => op.name === 'ClubAdminHostPodsTable' && op.variables.lifecycle === 'COMPLETED')).toBe(true),
    );
    expect(screen.getByTestId('location').textContent).toContain('tab=past');
  });

  it('says so for a user who does not host this club', async () => {
    mount({ ClubAdminHostDetail: { clubAdminHostDetail: null } });
    expect(await screen.findByTestId('club-host-not-found')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to hosts' }).getAttribute('href')).toBe('/club-admin/clubs/club-1/hosts');
  });
});
