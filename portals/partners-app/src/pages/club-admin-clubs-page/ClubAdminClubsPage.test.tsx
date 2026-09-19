import '../../../__tests__/helpers/agGridEnv';
import '../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminClubsPage from './ClubAdminClubsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink } from '../../__tests__/groupC-link';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const clubInfo = (over: Record<string, unknown> = {}) => ({
  __typename: 'ClubAdminClubInfoRow',
  id: 'club-1',
  club_name: 'Sunrise Tennis Club',
  slug: 'sunrise-tennis',
  cover_image_url: 'https://ik.imagekit.io/duncit/clubs/sunrise.jpg',
  super_category: 'Sports',
  category: 'Tennis',
  locality: 'Indiranagar',
  location_label: 'Bengaluru',
  followers_count: 128,
  total_pods: 14,
  upcoming_pods: 3,
  matched_venues_count: 5,
  is_verified: true,
  is_active: true,
  created_at: '2026-01-10T10:00:00.000Z',
  ...over,
});

/** A club set up before categories and localities existed. */
const bareClub = clubInfo({
  id: 'club-2',
  club_name: 'Old Town Readers',
  slug: 'old-town-readers',
  cover_image_url: null,
  super_category: null,
  category: null,
  locality: '',
  location_label: null,
  is_verified: false,
});

const mount = (rows: readonly unknown[]) =>
  renderWithProviders(<ClubAdminClubsPage />, {
    link: scriptedLink({
      MyAdminClubsTable: {
        myAdminClubsTable: { __typename: 'ClubAdminClubInfoTablePage', total: rows.length, rows },
      },
    }),
  });

const rowOf = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

describe('ClubAdminClubsPage', () => {
  it('lists each club with its category, locality and counts', async () => {
    mount([clubInfo(), bareClub]);

    expect(screen.getByRole('heading', { name: 'Your Clubs' })).toBeTruthy();
    const sunrise = rowOf(await screen.findByText('Sunrise Tennis Club'));
    expect(within(sunrise).getByText('sunrise-tennis')).toBeTruthy();
    expect(within(sunrise).getByText('Tennis')).toBeTruthy();
    expect(within(sunrise).getByText('Indiranagar')).toBeTruthy();
    expect(within(sunrise).getByText('128')).toBeTruthy();
    expect(within(sunrise).getByRole('img', { name: 'Sunrise Tennis Club' })).toBeTruthy();

    // Missing category and locality read as dashes, not blanks.
    const readers = rowOf(screen.getByText('Old Town Readers'));
    expect(within(readers).getAllByText('—')).toHaveLength(2);
    expect(within(readers).getByText('Unverified')).toBeTruthy();
    expect(within(readers).getByRole('link', { name: 'Pods' }).getAttribute('href')).toBe(
      '/club-admin/clubs/club-2',
    );
  });

  it('opens the club’s details when its row is clicked', async () => {
    mount([clubInfo()]);

    fireEvent.click(await screen.findByText('Sunrise Tennis Club'));
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club-1/edit'),
    );
  });

  it('says so when no club is assigned', async () => {
    mount([]);
    expect(await screen.findByText('No clubs are assigned to you yet.')).toBeTruthy();
  });
});
