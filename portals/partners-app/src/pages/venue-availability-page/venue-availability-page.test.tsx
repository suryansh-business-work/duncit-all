import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import VenueAvailabilityPage from './VenueAvailabilityPage';
import { MY_VENUES } from '../register-venue-page/queries';

afterEach(cleanup);

const VENUE_ID = 'venue-1';

const venue = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: VENUE_ID,
  status: 'APPROVED',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  venue_name: 'Skyline Banquets',
  venue_type: 'BANQUET',
  capacity: 120,
  capacity_items: [{ __typename: 'VenueCapacityItem', label: 'Hall', capacity: 80 }],
  cover_image_url: '',
  city: 'Pune',
  locality: 'Baner',
  settings: null,
  ...over,
});

const venuesMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: MY_VENUES, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myVenues: [venue(over)] } },
});

function renderPage(mocks: MockedResponse[]) {
  const ui: ReactElement = (
    <MemoryRouter initialEntries={[`/venue-availability/${VENUE_ID}`]}>
      <Routes>
        <Route path="/venue-availability/:venueId" element={<VenueAvailabilityPage />} />
        <Route path="/register-venue" element={<div>Venues list</div>} />
      </Routes>
    </MemoryRouter>
  );
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );
}

// The calendar, drawer and recurring dialog are @duncit/availability-calendar's
// and are covered there; what is left here is the venue lookup and its gates.
describe('VenueAvailabilityPage guards', () => {
  it('refuses a venue that is not on my list and links back', async () => {
    renderPage([venuesMock({ id: 'someone-elses' })]);

    await waitFor(() => expect(screen.getByText("Venue not found, or it isn't yours.")).toBeTruthy());
    expect(screen.queryByText('Slot availability')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Back to venues' }));
    expect(screen.getByText('Venues list')).toBeTruthy();
  });

  it('blocks editing until the venue is approved, naming the current status', async () => {
    renderPage([venuesMock({ status: 'PENDING' })]);

    await waitFor(() =>
      expect(
        screen.getByText('Availability is only editable once your venue is approved (current status: PENDING).'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText('Slot availability')).toBeNull();
  });
});
