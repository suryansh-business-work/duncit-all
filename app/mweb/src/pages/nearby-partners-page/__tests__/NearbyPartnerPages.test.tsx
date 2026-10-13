import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { AppLocationProvider } from '../../../app/AppLocationContext';
import NearbyHostsPage from '../NearbyHostsPage';
import NearbyVenuesPage from '../NearbyVenuesPage';
import {
  NEARBY_HOSTS_FOR_VENUE,
  NEARBY_VENUES_FOR_HOST,
  POD_REQUEST_QUOTA,
  SEARCH_CATEGORIES,
  SEARCH_HOST_CATEGORIES,
  SEARCH_OWNER_VENUES,
  SEND_POD_PARTNER_REQUEST,
  type NearbySearchInput,
} from '../queries';

vi.mock('../../../hooks/useAutoPodCityLabel', () => ({
  useAutoPodCityLabel: (id: string) => (id === 'loc-lko' ? 'Lucknow' : undefined),
}));

const always = { maxUsageCount: Number.POSITIVE_INFINITY };

const categoriesMock: MockedResponse = {
  request: { query: SEARCH_CATEGORIES },
  result: { data: { categories: [] } },
  ...always,
};

const searchAt = (category_ids: string[]): NearbySearchInput => ({
  location_id: 'loc-lko',
  zone_name: 'Gomti Nagar',
  radius_km: 5,
  category_ids,
});

const quotaMock = (variables: Record<string, string>, remaining = 4): MockedResponse => ({
  request: { query: POD_REQUEST_QUOTA, variables },
  result: { data: { podPartnerRequestQuota: { __typename: 'PartnerRequestQuota', limit: 5, remaining } } },
  ...always,
});

const sendMock = (input: Record<string, unknown>): MockedResponse => ({
  request: { query: SEND_POD_PARTNER_REQUEST, variables: { input } },
  result: { data: { sendPodPartnerRequest: { __typename: 'PodPartnerRequest', id: 'req-new', status: 'REQUESTED' } } },
});

function renderPage(page: ReactNode, mocks: MockedResponse[], locationId = 'loc-lko') {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[categoriesMock, ...mocks]}>
      <MemoryRouter>
        <AppLocationProvider locationId={locationId} zoneName="Gomti Nagar">
          {page}
        </AppLocationProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

/** An owner's venue: `categories` is every category it has, primary first (none = no category). */
const ownerVenue = (id: string, status: string, ...categories: (string | null)[]) => ({
  __typename: 'Venue',
  id,
  venue_name: `Venue ${id}`,
  city: 'Lucknow',
  status,
  venue_category: { __typename: 'VenueCategory', category_id: categories[0] ?? null },
  venue_categories: categories.map((category_id) => ({ __typename: 'VenueCategory', category_id })),
});

const nearbyHost = (user_id: string, name: string) => ({
  __typename: 'NearbyHost',
  user_id,
  name,
  photo_url: '',
  categories: ['Running', 'Cycling'],
  distance_km: 2,
  open_request_status: null,
});

const hostsMock = (venueId: string, categories: string[], hosts: ReturnType<typeof nearbyHost>[]): MockedResponse => ({
  request: { query: NEARBY_HOSTS_FOR_VENUE, variables: { venue_id: venueId, search: searchAt(categories) } },
  result: { data: { nearbyHostsForVenue: hosts } },
  ...always,
});

describe('NearbyHostsPage (Venue Studio)', () => {
  const venuesMock: MockedResponse = {
    request: { query: SEARCH_OWNER_VENUES },
    result: {
      data: {
        myVenues: [
          ownerVenue('v1', 'APPROVED', 'cat-sports'),
          ownerVenue('v2', 'APPROVED', 'cat-music'),
          ownerVenue('v3', 'REJECTED', 'cat-food'),
        ],
      },
    },
    ...always,
  };

  it("searches around the header's location for the venue's own category and sends a VENUE_TO_HOST request", async () => {
    renderPage(<NearbyHostsPage />, [
      venuesMock,
      hostsMock('v1', ['cat-sports'], [nearbyHost('host-1', 'Asha')]),
      quotaMock({ side: 'VENUE', venue_id: 'v1' }),
      sendMock({ direction: 'VENUE_TO_HOST', venue_id: 'v1', host_user_id: 'host-1', note: null }),
    ]);

    const card = await screen.findByTestId('nearby-card-host-1');
    expect(within(card).getByText('Running · Cycling')).toBeInTheDocument();
    expect(await screen.findByTestId('nearby-quota')).toHaveTextContent(/4\W*of\W*5/);

    fireEvent.click(screen.getByTestId('nearby-card-request-host-1'));
    fireEvent.click(screen.getByTestId('request-pod-send'));

    await waitFor(() => expect(screen.queryByTestId('request-pod-form')).not.toBeInTheDocument());
    expect(screen.queryByTestId('request-pod-error')).not.toBeInTheDocument();
  });

  // Searching on the primary alone would hide every host in the venue's other categories.
  it('starts from every category the venue has, each once, primary first', async () => {
    renderPage(<NearbyHostsPage />, [
      {
        request: { query: SEARCH_OWNER_VENUES },
        result: { data: { myVenues: [ownerVenue('v1', 'APPROVED', 'cat-music', 'cat-sports', 'cat-music', null)] } },
        ...always,
      },
      // Only the search carrying BOTH categories is answered: the primary alone finds nobody.
      hostsMock('v1', ['cat-music'], []),
      hostsMock('v1', ['cat-music', 'cat-sports'], [nearbyHost('host-7', 'Meera')]),
      quotaMock({ side: 'VENUE', venue_id: 'v1' }),
    ]);

    expect(await screen.findByTestId('nearby-card-host-7')).toBeInTheDocument();
  });

  it('starts unfiltered for a venue with no category', async () => {
    renderPage(<NearbyHostsPage />, [
      {
        request: { query: SEARCH_OWNER_VENUES },
        result: { data: { myVenues: [ownerVenue('v1', 'APPROVED')] } },
        ...always,
      },
      hostsMock('v1', [], [nearbyHost('host-8', 'Zoya')]),
      quotaMock({ side: 'VENUE', venue_id: 'v1' }),
    ]);

    expect(await screen.findByTestId('nearby-card-host-8')).toBeInTheDocument();
  });

  it("switching venue searches for that venue with its own category, and only approved venues are offered", async () => {
    renderPage(<NearbyHostsPage />, [
      venuesMock,
      hostsMock('v1', ['cat-sports'], []),
      hostsMock('v2', ['cat-music'], [nearbyHost('host-2', 'Ravi')]),
      quotaMock({ side: 'VENUE', venue_id: 'v1' }),
      quotaMock({ side: 'VENUE', venue_id: 'v2' }),
    ]);
    await screen.findByTestId('nearby-empty');

    fireEvent.mouseDown(within(screen.getByTestId('venue-switcher')).getByRole('combobox'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Venue v1'),
      expect.stringContaining('Venue v2'),
    ]);
    fireEvent.click(options[1]);

    expect(await screen.findByTestId('nearby-card-host-2')).toBeInTheDocument();
  });

  it('asks for an approved venue when the owner has none', async () => {
    renderPage(<NearbyHostsPage />, [
      { request: { query: SEARCH_OWNER_VENUES }, result: { data: { myVenues: [ownerVenue('v3', 'PENDING', null)] } } },
    ]);

    expect(await screen.findByText('Pod Requests open once one of your venues is approved.')).toBeInTheDocument();
    expect(screen.queryByTestId('nearby-search-filters')).not.toBeInTheDocument();
  });

  it('does not search before a city is picked', async () => {
    renderPage(
      <NearbyHostsPage />,
      [venuesMock, quotaMock({ side: 'VENUE', venue_id: 'v1' })],
      '',
    );

    expect(await screen.findByTestId('nearby-pick-location')).toBeInTheDocument();
  });
});

describe('NearbyVenuesPage (Host Studio)', () => {
  const hostCategoriesMock = (categories: (string | null)[]): MockedResponse => ({
    request: { query: SEARCH_HOST_CATEGORIES },
    result: {
      data: {
        myHost: {
          __typename: 'Host',
          id: 'host-doc',
          host_categories: categories.map((category_id) => ({ __typename: 'HostCategory', category_id })),
        },
      },
    },
    ...always,
  });

  const venuesMock = (categories: string[], venueCategories: string[] = ['Sports']): MockedResponse => ({
    request: { query: NEARBY_VENUES_FOR_HOST, variables: { search: searchAt(categories) } },
    result: {
      data: {
        nearbyVenuesForHost: [
          {
            __typename: 'NearbyVenue',
            id: 'venue-1',
            venue_name: 'Gomti Arena',
            category: venueCategories[0] ?? '',
            categories: venueCategories,
            locality: 'Gomti Nagar',
            city: 'Lucknow',
            cover_image_url: '',
            distance_km: 0.8,
            open_request_status: null,
          },
        ],
      },
    },
    ...always,
  });

  it("starts from the host's categories (once each, blanks dropped) and sends a HOST_TO_VENUE request with the note", async () => {
    renderPage(<NearbyVenuesPage />, [
      hostCategoriesMock(['cat-run', 'cat-run', null, 'cat-cycle']),
      venuesMock(['cat-run', 'cat-cycle']),
      quotaMock({ side: 'HOST' }),
      sendMock({ direction: 'HOST_TO_VENUE', venue_id: 'venue-1', note: 'Morning run?' }),
    ]);

    const card = await screen.findByTestId('nearby-card-venue-1');
    expect(within(card).getByText('Sports')).toBeInTheDocument();
    expect(within(card).getByText('Gomti Nagar, Lucknow')).toBeInTheDocument();
    expect(screen.getByTestId('nearby-venues-page')).toHaveTextContent('Search Nearby Venues');

    fireEvent.click(screen.getByTestId('nearby-card-request-venue-1'));
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Morning run?' } });
    fireEvent.click(screen.getByTestId('request-pod-send'));

    await waitFor(() => expect(screen.queryByTestId('request-pod-form')).not.toBeInTheDocument());
  });

  it('names every category of a venue in several on its card, primary first', async () => {
    renderPage(<NearbyVenuesPage />, [
      hostCategoriesMock(['cat-run']),
      venuesMock(['cat-run'], ['Sports', 'Music']),
      quotaMock({ side: 'HOST' }),
    ]);

    const card = await screen.findByTestId('nearby-card-venue-1');
    expect(within(card).getByText('Sports · Music')).toBeInTheDocument();
  });

  it("shows the host lookup's failure", async () => {
    renderPage(<NearbyVenuesPage />, [
      { request: { query: SEARCH_HOST_CATEGORIES }, error: new Error('Host profile unavailable') },
      quotaMock({ side: 'HOST' }),
    ]);

    expect(await screen.findByText('Host profile unavailable')).toBeInTheDocument();
  });
});
