import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
let params: Record<string, string | undefined> = { venueId: 'v1' };
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => params,
}));

// Stub the pods section so it doesn't fire its own GraphQL query / pricing hook.
vi.mock('../venues-page/VenuePodsSection', () => ({
  default: ({ venueId }: { venueId: string }) => (
    <div data-testid="venue-pods-stub">pods-{venueId}</div>
  ),
}));

import VenueDetailsPage from '../VenueDetailsPage';

// Re-declared identical to the (unexported) document inside the page; Apollo
// MockedProvider matches on the printed query AST.
const PUBLIC_VENUES = gql`
  query PublicVenueDetails {
    publicVenues {
      id
      venue_name
      venue_type
      capacity
      description
      amenities
      facilities
      security
      cover_image_url
      gallery
      address_line1
      address_line2
      city
      state
      locality
      postal_code
      country
      lat
      lng
      tags
    }
  }
`;

const baseVenue = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  venue_name: 'Grand Hall',
  venue_type: 'Banquet',
  capacity: 300,
  description: 'A lovely spot',
  amenities: ['WiFi', 'Parking'],
  facilities: ['Stage'],
  security: ['CCTV'],
  cover_image_url: 'https://img/cover.jpg',
  gallery: ['https://img/g1.jpg', 'https://img/g2.jpg'],
  address_line1: 'Line 1',
  address_line2: 'Line 2',
  city: 'Pune',
  state: 'MH',
  locality: 'Baner',
  postal_code: '411045',
  country: 'India',
  lat: 18.5,
  lng: 73.8,
  tags: ['premium'],
  ...over,
});

const venuesMock = (venues: unknown[]) => ({
  request: { query: PUBLIC_VENUES },
  result: { data: { publicVenues: venues } },
});

const setup = (mocks: unknown[], ui: ReactElement) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
  params = { venueId: 'v1' };
});

describe('VenueDetailsPage', () => {
  it('shows the loading spinner before data resolves', () => {
    setup([venuesMock([baseVenue()])], <VenueDetailsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the populated venue detail with images, chips, sections and pods', async () => {
    setup([venuesMock([baseVenue()])], <VenueDetailsPage />);
    // heading appears twice (cover fallback would differ) -> use role heading query
    expect(await screen.findByRole('heading', { name: 'Grand Hall', level: 4 })).toBeInTheDocument();
    // type + capacity + tag chips
    expect(screen.getByText('Banquet')).toBeInTheDocument();
    expect(screen.getByText('300 capacity')).toBeInTheDocument();
    expect(screen.getByText('premium')).toBeInTheDocument();
    // description
    expect(screen.getByText('A lovely spot')).toBeInTheDocument();
    // address joined
    expect(
      screen.getByText('Line 1, Line 2, Baner, Pune, MH, 411045, India'),
    ).toBeInTheDocument();
    // chip sections
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Facilities')).toBeInTheDocument();
    expect(screen.getByText('Venue Security')).toBeInTheDocument();
    // extra gallery images section ( >1 image )
    expect(screen.getByText('Images')).toBeInTheDocument();
    // pods stub
    expect(screen.getByTestId('venue-pods-stub')).toHaveTextContent('pods-v1');
    // cover image present
    const cover = screen.getAllByRole('img')[0] as HTMLImageElement;
    expect(cover.src).toContain('cover.jpg');
  });

  it('navigates back when Back is clicked', async () => {
    setup([venuesMock([baseVenue()])], <VenueDetailsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Back/i }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('copies the link and shows a success snackbar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    setup([venuesMock([baseVenue()])], <VenueDetailsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Copy link/i }));
    expect(await screen.findByText('Venue link copied')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalled();
  });

  it('shows an unavailable snackbar when clipboard write fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('nope')) },
      configurable: true,
    });
    setup([venuesMock([baseVenue()])], <VenueDetailsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Copy link/i }));
    expect(await screen.findByText('Copy is unavailable in this browser')).toBeInTheDocument();
  });

  it('renders the name fallback block when there is no image', async () => {
    setup(
      [venuesMock([baseVenue({ cover_image_url: null, gallery: [] })])],
      <VenueDetailsPage />,
    );
    // fallback heading (level 4 name shown twice now: fallback + title). Both exist.
    const headings = await screen.findAllByRole('heading', { name: 'Grand Hall' });
    expect(headings.length).toBeGreaterThanOrEqual(2);
    // no Images section with a single/zero image
    expect(screen.queryByText('Images')).not.toBeInTheDocument();
  });

  it('renders the not-found state when the venue id is missing from the list', async () => {
    params = { venueId: 'does-not-exist' };
    setup([venuesMock([baseVenue()])], <VenueDetailsPage />);
    expect(await screen.findByText('Venue not found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('renders the not-found state on query error', async () => {
    setup(
      [{ request: { query: PUBLIC_VENUES }, error: new Error('boom') }],
      <VenueDetailsPage />,
    );
    expect(await screen.findByText('Venue not found')).toBeInTheDocument();
  });

  it('omits optional sections when the venue has no extras', async () => {
    setup(
      [
        venuesMock([
          baseVenue({
            description: null,
            amenities: [],
            facilities: null,
            security: null,
            tags: null,
            gallery: null,
          }),
        ]),
      ],
      <VenueDetailsPage />,
    );
    await screen.findByRole('heading', { name: 'Grand Hall', level: 4 });
    await waitFor(() => expect(screen.queryByText('Amenities')).not.toBeInTheDocument());
    expect(screen.queryByText('A lovely spot')).not.toBeInTheDocument();
    expect(screen.queryByText('Images')).not.toBeInTheDocument();
  });
});
