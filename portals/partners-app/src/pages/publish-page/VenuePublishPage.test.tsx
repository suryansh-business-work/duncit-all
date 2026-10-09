import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../__tests__/render';
import { myVenue as venue, myVenuesMock as venuesMock } from '../../__tests__/venue-fixtures';
import { SELECTED_VENUE_KEY } from '../../components/venue/useSelectedVenue';
import VenuePublishPage from './VenuePublishPage';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const NEEDS_APPROVAL = 'Your venue can be published once it is approved.';

describe('VenuePublishPage', () => {
  it('opens on the selected venue and explains why an unapproved one cannot be published', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-draft');
    renderWithProviders(<VenuePublishPage />, {
      mocks: [venuesMock([venue('v-live', 'Rooftop', 'APPROVED'), venue('v-draft', 'Garden', 'SUBMITTED')])],
    });

    expect(await screen.findByText(NEEDS_APPROVAL)).toBeTruthy();
    expect(screen.getByRole('combobox').textContent).toContain('Garden');
  });

  it('hands an approved venue to the publish card, and remembers the switch', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-draft');
    renderWithProviders(<VenuePublishPage />, {
      mocks: [venuesMock([venue('v-live', 'Rooftop', 'APPROVED'), venue('v-draft', 'Garden', 'SUBMITTED')])],
    });

    fireEvent.mouseDown(await screen.findByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: /Rooftop/ }));

    expect(screen.queryByText(NEEDS_APPROVAL)).toBeNull();
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-live');
  });

  it('says so when the owner has no venue yet', async () => {
    renderWithProviders(<VenuePublishPage />, { mocks: [venuesMock([])] });

    expect(await screen.findByText('You have no venues yet.')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
