import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { renderWithProviders } from '../../testkit';
import { CLUB_DETAIL } from '../../../src/clubs/detail/queries';
import { SET_CLUB_HIDDEN } from '../../../src/shared/visibility/queries';
import ClubDetailsPage from '../../../src/clubs/detail/ClubDetailsPage';

const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));
const podsTabMounts = vi.hoisted(() => ({ count: 0 }));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: session.roles } }),
}));

// The tabs have their own suites; the page only decides which one is shown
// and what it is handed.
vi.mock('../../../src/clubs/detail/ClubOverviewTab', () => ({
  default: ({ club, podCount }: { club: { club_name: string }; podCount: number }) => (
    <div data-testid="overview-tab">{`${club.club_name}|pods:${podCount}`}</div>
  ),
}));
vi.mock('../../../src/clubs/detail/ClubHostsTab', () => ({
  default: ({ clubId, hostUserIds }: { clubId: string; hostUserIds: string[] }) => (
    <div data-testid="hosts-tab">{`${clubId}|${hostUserIds.join(',')}`}</div>
  ),
}));
vi.mock('../../../src/clubs/detail/ClubPodsTab', () => ({
  default: function PodsTab({ clubId }: { clubId: string }) {
    useEffect(() => {
      podsTabMounts.count += 1;
    }, []);
    return <div data-testid="pods-tab">{clubId}</div>;
  },
}));
vi.mock('../../../src/shared/change-logs', () => ({
  default: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
    <div data-testid="change-logs">{`${entityType}|${entityId}`}</div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

const CLUB = {
  __typename: 'Club',
  id: 'club-1',
  club_id: 'chess-hub',
  club_name: 'Chess Hub',
  club_description: null,
  category_id: null,
  super_category_id: null,
  is_verified: true,
  is_active: true,
  is_hidden: false,
  hidden_reason: null,
  locality: 'Indiranagar',
  followers_count: 10,
  matched_venues_count: 2,
  rating: 4.5,
  ratings_count: 8,
  club_whats_app_community_link: null,
  club_whats_app_group_link: null,
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  club_feature_images_and_videos: [],
  club_moments: [],
  admin_user_ids: [],
  club_admins: [],
  hosts: [
    { __typename: 'Host', id: 'host-1' },
    { __typename: 'Host', id: 'host-2' },
  ],
};

const detailMock = (club: Record<string, unknown> | null, times = 1): MockedResponse => ({
  request: { query: CLUB_DETAIL, variables: { id: 'club-1', clubKey: 'club-1' } },
  maxUsageCount: times,
  result: {
    data: { club, podCount: { __typename: 'PodsTablePage', total: 12 } },
  },
});

const publicSettingsMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd/MM/yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2026-01-01T00:00:00.000Z',
        min_signup_age: 13,
        draft_retention_days: 30,
        ticket_discount_max_pct: 50,
        happening_nearby_days: 7,
      },
    },
  },
});

const renderPage = (mocks: MockedResponse[], entry = '/clubs/club-1') =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [entry],
    routes: (
      <>
        <Route
          path="/clubs/:id"
          element={
            <>
              <ClubDetailsPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/clubs" element={<LocationProbe />} />
        <Route path="/clubs/:id/edit" element={<LocationProbe />} />
      </>
    ),
  });

beforeEach(() => {
  session.roles = ['SUPER_ADMIN'];
  podsTabMounts.count = 0;
});

describe('ClubDetailsPage / header', () => {
  it('heads the page with the club, its state and id, and opens on the overview with the pod count', async () => {
    renderPage([detailMock(CLUB), publicSettingsMock()]);

    expect(await screen.findByRole('heading', { name: 'Chess Hub' })).toBeInTheDocument();
    expect(screen.getByText('/chess-hub')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTitle('Verified')).toBeInTheDocument();
    expect(screen.getByTestId('overview-tab')).toHaveTextContent('Chess Hub|pods:12');
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('shows an inactive, unverified club as such', async () => {
    renderPage([detailMock({ ...CLUB, is_active: false, is_verified: false })]);

    expect(await screen.findByText('Inactive')).toBeInTheDocument();
    expect(screen.queryByTitle('Verified')).not.toBeInTheDocument();
  });

  it('warns when the club does not exist', async () => {
    renderPage([detailMock(null)]);
    expect(await screen.findByText('Club not found.')).toBeInTheDocument();
  });

  it('shows the server error when the club cannot be read', async () => {
    renderPage([
      {
        request: { query: CLUB_DETAIL, variables: { id: 'club-1', clubKey: 'club-1' } },
        result: { errors: [new GraphQLError('Not allowed')] },
      },
    ]);
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
  });

  it('goes back to the clubs list and on to the editor', async () => {
    renderPage([detailMock(CLUB, 2)]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit club' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/clubs/club-1/edit');
  });

  it('returns to the clubs list from the back button', async () => {
    renderPage([detailMock(CLUB)]);
    await screen.findByRole('heading', { name: 'Chess Hub' });
    fireEvent.click(screen.getByRole('button', { name: /Clubs/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/clubs');
    expect(screen.getByTestId('location').textContent).toBe('/clubs');
  });
});

describe('ClubDetailsPage / tabs', () => {
  it('lists the club’s hosts by record id on the Hosts tab', async () => {
    renderPage([detailMock(CLUB)], '/clubs/club-1?selectedtab=hosts');

    expect(await screen.findByTestId('hosts-tab')).toHaveTextContent('club-1|host-1,host-2');
    expect(screen.queryByTestId('overview-tab')).not.toBeInTheDocument();
  });

  it('opens the club’s pods on the Pods tab', async () => {
    renderPage([detailMock(CLUB)], '/clubs/club-1?selectedtab=pods');
    expect(await screen.findByTestId('pods-tab')).toHaveTextContent('club-1');
  });

  it('shows this club’s own change history on the Change Logs tab', async () => {
    renderPage([detailMock(CLUB)], '/clubs/club-1?selectedtab=changeLogs');
    expect(await screen.findByTestId('change-logs')).toHaveTextContent('CLUB|club-1');
  });

  it('switches tab from the strip', async () => {
    renderPage([detailMock(CLUB)]);
    fireEvent.click(await screen.findByRole('tab', { name: 'Change Logs' }));
    expect(await screen.findByTestId('change-logs')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-tab')).not.toBeInTheDocument();
  });
});

describe('ClubDetailsPage / hiding', () => {
  it('offers Hide to a governor, asks for a reason, and shows the club as hidden afterwards', async () => {
    const hiddenClub = { ...CLUB, is_hidden: true, hidden_reason: 'Spam' };
    renderPage(
      [
        detailMock(CLUB),
        detailMock(hiddenClub, Number.POSITIVE_INFINITY),
        publicSettingsMock(),
        {
          request: {
            query: SET_CLUB_HIDDEN,
            variables: { id: 'club-1', hidden: true, reason: 'Spam' },
          },
          result: {
            data: {
              setClubHidden: {
                __typename: 'Club',
                id: 'club-1',
                is_hidden: true,
                hidden_reason: 'Spam',
              },
            },
          },
        },
      ],
      '/clubs/club-1?selectedtab=pods',
    );

    await screen.findByTestId('pods-tab');
    expect(podsTabMounts.count).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Hide this club?')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Spam' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));

    expect(await screen.findByText('This club and every pod in it are hidden from the app.')).toBeInTheDocument();
    // The dialog is still fading out, which keeps the page aria-hidden for a beat.
    expect(await screen.findByRole('button', { name: 'Show' })).toBeInTheDocument();
    // The pods table is not a watched query, so a hide re-keys it to reload.
    await waitFor(() => expect(podsTabMounts.count).toBe(2));
  });

  it('offers Show for a hidden club', async () => {
    renderPage([detailMock({ ...CLUB, is_hidden: true, hidden_reason: 'Spam' })]);

    expect(await screen.findByRole('button', { name: 'Show' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
  });

  it('withholds Hide / Show from a viewer who may not govern', async () => {
    session.roles = ['ALL_CLUBS_ACCESS'];
    renderPage([detailMock(CLUB)]);

    await screen.findByRole('heading', { name: 'Chess Hub' });
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show' })).not.toBeInTheDocument();
  });
});
