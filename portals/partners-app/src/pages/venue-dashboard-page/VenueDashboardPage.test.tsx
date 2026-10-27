import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import VenueDashboardPage from './VenueDashboardPage';
import { MY_VENUES } from '../register-venue-page/queries';
import { shapeOf } from '../../__tests__/doc-shape';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

vi.mock('@duncit/dashboard', () => import('../../__tests__/dashboard-mock'));
vi.mock('@duncit/public-page', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PublishPageCard: (props: { kind: string; refId: string; title: string }) => (
    <div data-testid="publish-card">{`${props.kind}:${props.refId}:${props.title}`}</div>
  ),
}));
vi.mock('@duncit/availability-calendar', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  UpcomingBookings: (props: { venueId: string | null; showVenue: boolean }) => (
    <div data-testid="upcoming">{`${String(props.venueId)}|${props.showVenue}`}</div>
  ),
}));

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const venue = (id: string, name: string | null, status = 'APPROVED') => ({ __typename: 'Venue', id, venue_name: name, status });

const stats = {
  venueOwnerStats: {
    __typename: 'VenueOwnerStats',
    total_venues: 2,
    approved_venues: 1,
    total_capacity: 80,
    potential_earning: 12000,
    booked_earning: 4000,
    upcoming_slots: 6,
    booked_slots: 3,
    pending_requests: 1,
  },
};

const mount = (venues: unknown[], answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<VenueDashboardPage />, {
    route: '/venues/dashboard',
    link: scriptedLink(
      { MyVenues: shapeOf(MY_VENUES, { myVenues: venues }), VenueOwnerStats: stats, ...answers },
      sent,
    ),
  });

describe('VenueDashboardPage', () => {
  it('opens on the selected venue: its stats, its bookings and its public page', async () => {
    const sent: SentOperation[] = [];
    mount([venue('v1', 'Cafe Mocha')], {}, sent);
    expect(await screen.findByTestId('publish-card')).toBeTruthy();
    expect(screen.getByTestId('publish-card').textContent).toBe('VENUE:v1:Cafe Mocha');
    expect(screen.getByTestId('upcoming').textContent).toBe('v1|false');
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueOwnerStats').at(-1)?.variables).toEqual({ venue_id: 'v1' }));
  });

  it('offers the public page of an approved venue that has no name yet under an empty title', async () => {
    mount([venue('v1', null)]);
    expect((await screen.findByTestId('publish-card')).textContent).toBe('VENUE:v1:');
  });

  it('names an unnamed venue Untitled venue in the picker', async () => {
    mount([venue('v1', null), venue('v2', 'Arena')]);
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Venue' }));
    expect(await screen.findByRole('option', { name: 'Untitled venue' })).toBeTruthy();
  });

  it('offers no public page for a venue that is not approved yet', async () => {
    mount([venue('v1', 'Cafe Mocha', 'DRAFT')]);
    await screen.findByTestId('upcoming');
    expect(screen.queryByTestId('publish-card')).toBeNull();
  });

  it('shows every venue’s bookings, with their venue named, and no public page, when All venues is chosen', async () => {
    mount([venue('v1', 'Cafe Mocha'), venue('v2', 'Arena')]);
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Venue' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All venues' }));
    await waitFor(() => expect(screen.getByTestId('upcoming').textContent).toBe('null|true'));
    expect(screen.queryByTestId('publish-card')).toBeNull();
  });

  it('asks a partner with no venue to register one', async () => {
    mount([]);
    expect(await screen.findByText('Register your first venue to start publishing bookable slots.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Register venue' }).getAttribute('href')).toBe('/register-venue/new');
  });

  it('shows the server message when the stats cannot be read', async () => {
    mount([venue('v1', 'Cafe Mocha')], { VenueOwnerStats: new Error('Stats are down') });
    expect(await screen.findByText('Stats are down')).toBeTruthy();
  });
});
