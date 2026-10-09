import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import VenueSlotRequestsPage from '..';
import { MY_VENUES, VENUE_SLOT_REQUESTS } from '../queries';
import { SELECTED_VENUE_KEY } from '../../../hooks/useSelectedVenue';

const venuesMock = {
  request: { query: MY_VENUES },
  result: {
    data: {
      myVenues: [
        { __typename: 'Venue', id: 'v-turf', venue_name: 'Turf' },
        { __typename: 'Venue', id: 'v-hall', venue_name: 'Hall' },
      ],
    },
  },
};

const row = (slot_id: string, venue_id: string, pod_title: string) => ({
  __typename: 'VenueSlotRequest',
  slot_id,
  venue_id,
  venue_name: venue_id,
  start_at: '2099-08-01T10:00:00.000Z',
  end_at: '2099-08-01T12:00:00.000Z',
  whole_day: false,
  price: 500,
  requested_at: '2099-07-01T10:00:00.000Z',
  pod_id: `pod-${slot_id}`,
  pod_title,
  pod_description: '',
  host_name: 'Asha',
  host_email: 'asha@example.com',
  host_phone: '9999999999',
});

const requestsFor = (venue_id: string | null, rows: object[]) => ({
  request: { query: VENUE_SLOT_REQUESTS, variables: { venue_id } },
  result: { data: { venueSlotRequests: rows } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

function renderPage() {
  return render(
    <MockedProvider
      mockLinkDefaultOptions={{ delay: 0 }}
      mocks={[
        venuesMock,
        requestsFor('v-hall', [row('s-hall', 'v-hall', 'Hall Quiz')]),
        requestsFor(null, [row('s-hall', 'v-hall', 'Hall Quiz'), row('s-turf', 'v-turf', 'Turf Run')]),
      ]}
    >
      <MemoryRouter>
        <VenueSlotRequestsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('VenueSlotRequestsPage', () => {
  it('opens on the selected venue, with All venues one tap away', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-hall');
    renderPage();
    expect(await screen.findByText('Hall Quiz')).toBeInTheDocument();
    expect(screen.queryByText('Turf Run')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All venues' }));
    expect(await screen.findByText('Turf Run')).toBeInTheDocument();
    // "All" is this page's own view — the remembered venue stays the venue.
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-hall');
  });
});
