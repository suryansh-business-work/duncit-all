import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import BookingRequestsTab from './BookingRequestsTab';
import { myVenue } from '../../__tests__/venue-fixtures';
import { renderWithProviders } from '../../__tests__/render';
import { shapeOf } from '../../__tests__/doc-shape';
import { scriptedLink } from '../../__tests__/groupC-link';
import { MY_VENUES } from '../register-venue-page/queries';

vi.mock('@duncit/availability-calendar', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  VenueOfferInbox: (props: { venueId: string | null }) => <div data-testid="inbox">{String(props.venueId)}</div>,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const mount = (venues: unknown[]) =>
  renderWithProviders(<BookingRequestsTab />, { link: scriptedLink({ MyVenues: shapeOf(MY_VENUES, { myVenues: venues }) }) });

describe('BookingRequestsTab', () => {
  it('shows the inbox with no venue filter for an owner of one venue', async () => {
    mount([myVenue('v1', 'Rooftop')]);
    await waitFor(() => expect(screen.getByTestId('inbox').textContent).toBe('v1'));
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('offers a venue filter to an owner of several, naming an unnamed venue Untitled venue, and can show all of them', async () => {
    mount([myVenue('v1', 'Rooftop'), { ...myVenue('v2', 'x'), venue_name: null }]);
    fireEvent.mouseDown(await screen.findByRole('combobox'));
    expect(await screen.findByRole('option', { name: 'Untitled venue' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'All venues' }));
    await waitFor(() => expect(screen.getByTestId('inbox').textContent).toBe('null'));
  });
});
