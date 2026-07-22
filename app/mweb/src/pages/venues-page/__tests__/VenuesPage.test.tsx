import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

import VenuesPage, { VENUES_EXPLORE } from '../index';
import { ACTIVE_ADS } from '../../../components/ads/useActiveAds';
// The categories query is not exported; reference it through the component's fired op.

const venue = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  venue_name: `Venue ${id}`,
  venue_type: 'Cafe',
  capacity: 40,
  cover_image_url: null,
  city: 'Pune',
  locality: 'Baner',
  pod_count: 3,
  ...over,
});

const fiveVenues = ['1', '2', '3', '4', '5'].map((i) => venue(i));

// Categories query document is internal; capture the request shape by matching
// on the fired query via MockedProvider's structural match using the same gql.
import { gql } from '@apollo/client';
const SUPER_CATEGORIES = gql`
  query VenuesSuperCategories {
    categories(filter: { level: SUPER, parent_id: null }) {
      id
      name
      is_active
    }
  }
`;

const catMock = (categories: unknown[]) => ({
  request: { query: SUPER_CATEGORIES },
  result: { data: { categories } },
});

const adMock = (ads: unknown[]) => ({
  request: { query: ACTIVE_ADS, variables: { position: 'VENUE_LIST' } },
  result: { data: { activeAds: ads } },
});

const venuesMock = (
  vars: { location_id: string | null; search: string | null; super_category_id: string | null },
  venues: unknown[],
) => ({
  request: { query: VENUES_EXPLORE, variables: vars },
  result: { data: { publicVenues: venues } },
});

const baseVars = { location_id: 'loc-1', search: null, super_category_id: null };

const setup = (mocks: unknown[], ui: ReactElement) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('VenuesPage', () => {
  it('renders the city label, categories and venue cards, and interleaves an ad', async () => {
    const categories = [
      { id: 'c1', name: 'Food', is_active: true },
      { id: 'c2', name: 'Hidden', is_active: false },
    ];
    setup(
      [
        catMock(categories),
        adMock([{ id: 'ad-1', ad_type: 'IMAGE', media_url: 'x', redirect_url: null, ad_title: 'Buy', position: 'VENUE_LIST' }]),
        venuesMock(baseVars, fiveVenues),
      ],
      <VenuesPage locationId="loc-1" cityLabel="Pune" />,
    );

    expect(await screen.findByText('Venue 1')).toBeInTheDocument();
    expect(screen.getByText('Venues in Pune')).toBeInTheDocument();
    // active category shown, inactive filtered out
    expect(await screen.findByText('Food')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    // interleaved ad (5 venues, every 4 => one ad card)
    expect(await screen.findByTestId('ad-card')).toBeInTheDocument();
    // venue meta rendered
    expect(screen.getAllByText(/40 capacity/).length).toBeGreaterThan(0);
  });

  it('navigates to the venue detail on card tap', async () => {
    setup(
      [catMock([]), adMock([]), venuesMock(baseVars, [venue('9')])],
      <VenuesPage locationId="loc-1" />,
    );
    const card = await screen.findByTestId('venue-card-9');
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledWith('/venue/9');
  });

  it('shows the empty-state message when no venues match', async () => {
    setup(
      [catMock([]), adMock([]), venuesMock(baseVars, [])],
      <VenuesPage locationId="loc-1" />,
    );
    expect(
      await screen.findByText(/No venues found here yet/),
    ).toBeInTheDocument();
  });

  it('shows the error message when the query fails', async () => {
    setup(
      [
        catMock([]),
        adMock([]),
        { request: { query: VENUES_EXPLORE, variables: baseVars }, error: new Error('boom') },
      ],
      <VenuesPage locationId="loc-1" />,
    );
    expect(await screen.findByText(/Could not load venues/)).toBeInTheDocument();
  });

  it('refetches with the selected super-category on chip tap', async () => {
    const categories = [{ id: 'c1', name: 'Food', is_active: true }];
    setup(
      [
        catMock(categories),
        adMock([]),
        venuesMock(baseVars, [venue('1')]),
        venuesMock({ ...baseVars, super_category_id: 'c1' }, [venue('2')]),
      ],
      <VenuesPage locationId="loc-1" />,
    );
    fireEvent.click(await screen.findByText('Food'));
    expect(await screen.findByText('Venue 2')).toBeInTheDocument();
  });

  it('debounces the search input and refetches with the term', async () => {
    setup(
      [
        catMock([]),
        adMock([]),
        venuesMock(baseVars, [venue('1')]),
        venuesMock({ ...baseVars, search: 'jazz' }, [venue('7', { venue_name: 'Jazz Bar' })]),
      ],
      <VenuesPage locationId="loc-1" />,
    );
    await screen.findByText('Venue 1');
    fireEvent.change(screen.getByLabelText('Search venues'), { target: { value: 'jazz' } });
    expect(await screen.findByText('Jazz Bar', {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
