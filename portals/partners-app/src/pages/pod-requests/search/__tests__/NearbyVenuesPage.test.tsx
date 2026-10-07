import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import NearbyVenuesPage from '../NearbyVenuesPage';
import { partnerUser, renderWithProviders } from '../../../../__tests__/render';
import {
  STAY_PENDING,
  scriptedLink,
  type ScriptedAnswer,
  type SentOperation,
} from '../../../../__tests__/groupC-link';
import { category, quota } from '../../__tests__/fixtures';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const nearbyVenue = (over: Record<string, unknown> = {}) => ({
  __typename: 'NearbyVenue',
  id: 'venue-1',
  venue_name: 'Courtside Arena',
  category: 'Badminton',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  cover_image_url: '',
  distance_km: 3.4,
  open_request_status: null,
  ...over,
});

const hostCategories = (...ids: (string | null)[]) => ({
  myHost: {
    __typename: 'Host',
    id: 'host-1',
    host_categories: ids.map((category_id) => ({ __typename: 'HostCategory', category_id })),
  },
});

const base = (over: Record<string, ScriptedAnswer> = {}): Record<string, ScriptedAnswer> => ({
  PartnersNearbySearchHost: hostCategories('cat-badminton', 'cat-badminton', null, 'cat-yoga'),
  PartnersNearbyVenues: { nearbyVenuesForHost: [nearbyVenue()] },
  PartnersPodRequestQuota: quota(5, 4),
  AdminCategories: { categories: [category('cat-badminton', 'Badminton'), category('cat-yoga', 'Yoga')] },
  ...over,
});

const mount = (
  answers: Record<string, ScriptedAnswer>,
  sent: SentOperation[] = [],
  location: string | null = 'loc-blr',
) =>
  renderWithProviders(<NearbyVenuesPage />, {
    link: scriptedLink(answers, sent),
    route: '/host/nearby-venues',
    user: partnerUser({ selected_location_id: location }),
  });

const lastSent = (sent: SentOperation[], name: string) => sent.filter((op) => op.name === name).at(-1)?.variables;

describe('NearbyVenuesPage', () => {
  it('asks the host to pick a city before searching', async () => {
    const sent: SentOperation[] = [];
    mount(base(), sent, null);

    expect(await screen.findByText('Pick your city in the location picker to search nearby.')).toBeTruthy();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(sent.map((op) => op.name)).not.toContain('PartnersNearbyVenues');
  });

  it("searches the host's chosen city, filtered by the host's own categories once each", async () => {
    const sent: SentOperation[] = [];
    mount(base(), sent);

    expect(await screen.findByRole('heading', { name: 'Courtside Arena' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Pod Requests' }).getAttribute('href')).toBe('/host/pod-requests');
    expect(lastSent(sent, 'PartnersNearbyVenues')).toEqual({
      search: { location_id: 'loc-blr', radius_km: 5, category_ids: ['cat-badminton', 'cat-yoga'] },
    });
    expect(lastSent(sent, 'PartnersPodRequestQuota')).toEqual({ side: 'HOST', venue_id: null });
    expect(await screen.findByText('4 of 5 requests left this month')).toBeTruthy();
    const result = within(screen.getByTestId('nearby-result'));
    expect(result.getByText('Badminton')).toBeTruthy();
    expect(result.getByText('Indiranagar, Bengaluru')).toBeTruthy();
    expect(result.getByText('3.4 km away')).toBeTruthy();
  });

  it('shows the radar until both the host and the venues are in', async () => {
    const sent: SentOperation[] = [];
    mount(base({ PartnersNearbySearchHost: STAY_PENDING }), sent);

    const radar = (await screen.findByText('Searching Nearby Venues...')).closest('[role="status"]') as HTMLElement;
    expect(within(radar).getByText('5 km')).toBeTruthy();
    // The default filter is the host's categories, so the search waits for them.
    expect(sent.map((op) => op.name)).not.toContain('PartnersNearbyVenues');
  });

  it('shows a failed venue search as an error', async () => {
    mount(base({ PartnersNearbyVenues: new Error('Search is unavailable') }));

    expect(await screen.findByText('Search is unavailable')).toBeTruthy();
  });

  it('searches every category once the host clears the filter, and stays cleared', async () => {
    const sent: SentOperation[] = [];
    mount(base({ PartnersNearbyVenues: { nearbyVenuesForHost: [] } }), sent);

    expect(await screen.findByText('No venues found within 5 km.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try all categories' }));

    await waitFor(() =>
      expect(lastSent(sent, 'PartnersNearbyVenues')).toEqual({
        search: { location_id: 'loc-blr', radius_km: 5, category_ids: [] },
      }),
    );
    expect((await screen.findByRole('button', { name: 'All categories' })).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Try all categories' })).toBeNull();
  });

  it('starts unfiltered for a host with no categories', async () => {
    const sent: SentOperation[] = [];
    mount(base({ PartnersNearbySearchHost: { myHost: null } }), sent);

    await screen.findByRole('heading', { name: 'Courtside Arena' });
    expect(lastSent(sent, 'PartnersNearbyVenues')).toMatchObject({ search: { category_ids: [] } });
  });

  it('sends a host-to-venue request for the card chosen', async () => {
    const sent: SentOperation[] = [];
    mount(
      base({
        PartnersSendPodRequest: {
          sendPodPartnerRequest: { __typename: 'PodPartnerRequest', id: 'req-new', status: 'REQUESTED' },
        },
      }),
      sent,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Request Pod' }));
    const dialog = await screen.findByRole('dialog', { name: 'Request Pod · Courtside Arena' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request Pod' }));

    expect(await screen.findByText('Pod Request sent.')).toBeTruthy();
    expect(lastSent(sent, 'PartnersSendPodRequest')).toEqual({
      input: { direction: 'HOST_TO_VENUE', venue_id: 'venue-1', note: null },
    });
  });

  it("keeps the dialog open with the server's CONFLICT refusal", async () => {
    mount(base({ PartnersSendPodRequest: new Error('CONFLICT: you already have an open request with this venue') }));

    fireEvent.click(await screen.findByRole('button', { name: 'Request Pod' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request Pod' }));

    expect(await within(dialog).findByText('CONFLICT: you already have an open request with this venue')).toBeTruthy();
    expect(screen.queryByText('Pod Request sent.')).toBeNull();
  });
});
