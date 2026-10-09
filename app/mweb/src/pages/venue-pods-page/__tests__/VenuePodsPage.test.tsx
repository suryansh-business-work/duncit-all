import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VenuePodsPage from '..';
import { VENUE_STUDIO_PODS } from '../../../components/studio-pods';
import { MY_VENUES_SWITCHER } from '../../venue-manage-page/queries';
import { SELECTED_VENUE_KEY } from '../../../hooks/useSelectedVenue';

vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `when:${d}` }),
}));

const always = { maxUsageCount: Number.POSITIVE_INFINITY };

const venuesMock = {
  request: { query: MY_VENUES_SWITCHER },
  result: {
    data: {
      myVenues: [
        { __typename: 'Venue', id: 'v-turf', venue_name: 'Turf', city: 'Lucknow', status: 'APPROVED' },
        { __typename: 'Venue', id: 'v-hall', venue_name: 'Hall', city: 'Kanpur', status: 'APPROVED' },
      ],
    },
  },
  ...always,
};

const pod = (id: string, bucket: string, title: string) => ({
  __typename: 'VenuePod',
  id,
  pod_slug: id,
  pod_title: title,
  pod_date_time: '2099-08-01T10:00:00.000Z',
  pod_end_date_time: '2099-08-01T12:00:00.000Z',
  pod_amount: 0,
  pod_type: 'FREE',
  no_of_spots: 10,
  attendee_count: 2,
  pod_attendees: ['u1', 'u2'],
  host_names: ['Asha'],
  bucket,
  is_active: true,
  completed_at: null,
  cancelled_at: bucket === 'CANCELLED' ? '2099-07-20T10:00:00.000Z' : null,
  created_at: '2099-07-01T10:00:00.000Z',
  owner_id: 'v-hall',
  owner_name: 'Hall',
});

const summary = {
  __typename: 'VenuePodsSummary',
  scope_count: 1,
  total: 3,
  upcoming: 1,
  ongoing: 0,
  completed: 1,
  cancelled: 1,
  total_spots: 30,
  filled_spots: 6,
  total_attendees: 6,
  fill_rate: 0.2,
  next_pod_date_time: null,
  total_revenue: 0,
  currency_symbol: '₹',
};

const hallPodsMock = {
  request: { query: VENUE_STUDIO_PODS, variables: { venue_id: 'v-hall' } },
  result: {
    data: {
      studioPods: [
        pod('p-up', 'UPCOMING', 'Morning Run'),
        pod('p-done', 'COMPLETED', 'Last Week Jam'),
        pod('p-off', 'CANCELLED', 'Rained Out'),
      ],
      studioSummary: summary,
    },
  },
  ...always,
};

function renderPage(url = '/venues/pods') {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[venuesMock, hallPodsMock]}>
      <MemoryRouter initialEntries={[url]}>
        <VenuePodsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('VenuePodsPage', () => {
  it('opens on the remembered venue and files its pods under Upcoming / Current / Past', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-hall');
    renderPage();
    // Only v-hall's pods are mocked, so a row proves the page read that venue.
    expect(await screen.findByText('Morning Run')).toBeInTheDocument();
    expect(screen.queryByText('Last Week Jam')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('venue-pods-tab-current'));
    expect(screen.getByTestId('venue-pods-empty')).toHaveTextContent('No pod is running at this venue right now.');

    fireEvent.click(screen.getByTestId('venue-pods-tab-past'));
    // A cancelled pod is history too.
    expect(screen.getByText('Last Week Jam')).toBeInTheDocument();
    expect(screen.getByText('Rained Out')).toBeInTheDocument();
    expect(screen.queryByText('Morning Run')).not.toBeInTheDocument();
  });

  it('opens on the tab named in the URL', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-hall');
    renderPage('/venues/pods?selectedtab=PAST');
    expect(await screen.findByText('Rained Out')).toBeInTheDocument();
  });

  it('says so when the owner has no venue yet', async () => {
    render(
      <MockedProvider
        mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[{ request: { query: MY_VENUES_SWITCHER }, result: { data: { myVenues: [] } } }]}
      >
        <MemoryRouter>
          <VenuePodsPage />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(await screen.findByText('You have no venues yet.')).toBeInTheDocument();
  });
});
