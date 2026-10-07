import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import NearbyHostsPage from '../NearbyHostsPage';
import { renderWithProviders } from '../../../../__tests__/render';
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

const myVenue = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: 'venue-1',
  venue_name: 'Courtside Arena',
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc-blr',
  locality: 'Indiranagar',
  venue_category: { __typename: 'VenueCategory', category_id: 'cat-badminton' },
  ...over,
});

const nearbyHost = (over: Record<string, unknown> = {}) => ({
  __typename: 'NearbyHost',
  user_id: 'host-user-1',
  name: 'Kiran Shah',
  photo_url: '',
  categories: ['Badminton', 'Yoga'],
  distance_km: 1.2,
  open_request_status: null,
  ...over,
});

const base = (over: Record<string, ScriptedAnswer> = {}): Record<string, ScriptedAnswer> => ({
  PartnersNearbySearchVenues: { myVenues: [myVenue()] },
  PartnersNearbyHosts: { nearbyHostsForVenue: [nearbyHost()] },
  PartnersPodRequestQuota: quota(10, 3),
  AdminCategories: { categories: [category('cat-badminton', 'Badminton'), category('cat-yoga', 'Yoga')] },
  ...over,
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<NearbyHostsPage />, { link: scriptedLink(answers, sent), route: '/venues/nearby-hosts' });

const lastSent = (sent: SentOperation[], name: string) => sent.filter((op) => op.name === name).at(-1)?.variables;

describe('NearbyHostsPage — before it can search', () => {
  it('shows a skeleton while the venues load', () => {
    mount(base({ PartnersNearbySearchVenues: STAY_PENDING }));

    expect(screen.queryByTestId('pod-request-search')).toBeNull();
  });

  it('waits for an approved, active venue', async () => {
    const sent: SentOperation[] = [];
    mount(
      base({
        PartnersNearbySearchVenues: {
          myVenues: [myVenue({ status: 'PENDING' }), myVenue({ id: 'venue-2', is_active: false })],
        },
      }),
      sent,
    );

    expect(await screen.findByText('Pod Requests open once one of your venues is approved.')).toBeTruthy();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(sent.map((op) => op.name)).not.toContain('PartnersNearbyHosts');
    expect(sent.map((op) => op.name)).not.toContain('PartnersPodRequestQuota');
  });

  it('asks for a city on a venue that has none, without searching', async () => {
    const sent: SentOperation[] = [];
    mount(base({ PartnersNearbySearchVenues: { myVenues: [myVenue({ location_id: null })] } }), sent);

    expect(
      await screen.findByText('This venue has no city yet. Add one in Venue Management to search nearby.'),
    ).toBeTruthy();
    expect(sent.map((op) => op.name)).not.toContain('PartnersNearbyHosts');
  });

  it("shows why the venues could not be read", async () => {
    mount(base({ PartnersNearbySearchVenues: new Error('Not a venue owner') }));

    expect(await screen.findByText('Not a venue owner')).toBeTruthy();
    expect(screen.queryByTestId('nearby-result')).toBeNull();
  });
});

describe('NearbyHostsPage — searching', () => {
  it("searches around the venue's own city and area, filtered by its category", async () => {
    const sent: SentOperation[] = [];
    mount(base(), sent);

    expect(await screen.findByRole('heading', { name: 'Kiran Shah' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Pod Requests' }).getAttribute('href')).toBe(
      '/venues/pod-requests',
    );
    expect(lastSent(sent, 'PartnersNearbyHosts')).toEqual({
      venue_id: 'venue-1',
      search: { location_id: 'loc-blr', zone_name: 'Indiranagar', radius_km: 5, category_ids: ['cat-badminton'] },
    });
    expect(lastSent(sent, 'PartnersPodRequestQuota')).toEqual({ side: 'VENUE', venue_id: 'venue-1' });
    expect(await screen.findByText('3 of 10 requests left this month')).toBeTruthy();
    expect(screen.getByText('Badminton, Yoga')).toBeTruthy();
    expect(screen.getByText('1.2 km away')).toBeTruthy();
    // One venue needs no picker.
    expect(screen.queryByRole('combobox', { name: 'Venue' })).toBeNull();
  });

  it('shows the radar with the venue area while hosts are searched', async () => {
    mount(base({ PartnersNearbyHosts: STAY_PENDING }));

    expect(await screen.findByText('Searching Nearby Hosts...')).toBeTruthy();
    expect(screen.getByText('Looking within 5 km of Indiranagar')).toBeTruthy();
  });

  it("names the venue in the radar's hint when it has no area", async () => {
    mount(
      base({
        PartnersNearbySearchVenues: { myVenues: [myVenue({ locality: '' })] },
        PartnersNearbyHosts: STAY_PENDING,
      }),
    );

    expect(await screen.findByText('Looking within 5 km of Courtside Arena')).toBeTruthy();
  });

  it('shows a failed host search as an error', async () => {
    mount(base({ PartnersNearbyHosts: new Error('Search is unavailable') }));

    expect(await screen.findByText('Search is unavailable')).toBeTruthy();
  });

  it('widens an empty search to 10 km, then to every category', async () => {
    const sent: SentOperation[] = [];
    mount(base({ PartnersNearbyHosts: { nearbyHostsForVenue: [] } }), sent);

    expect(await screen.findByText('No hosts found within 5 km.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Search within 10 km' }));
    await waitFor(() =>
      expect(lastSent(sent, 'PartnersNearbyHosts')).toMatchObject({ search: { radius_km: 10, category_ids: ['cat-badminton'] } }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Try all categories' }));
    await waitFor(() =>
      expect(lastSent(sent, 'PartnersNearbyHosts')).toMatchObject({ search: { radius_km: 10, category_ids: [] } }),
    );
    expect(await screen.findByText('No hosts found within 10 km.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try all categories' })).toBeNull();
  });

  it('searches from the venue picked when the owner has several, each starting from its own category', async () => {
    const sent: SentOperation[] = [];
    mount(
      base({
        PartnersNearbySearchVenues: {
          myVenues: [
            myVenue(),
            myVenue({
              id: 'venue-2',
              venue_name: 'Lotus Studio',
              locality: 'Koramangala',
              venue_category: { __typename: 'VenueCategory', category_id: 'cat-yoga' },
            }),
          ],
        },
      }),
      sent,
    );

    const picker = await screen.findByRole('combobox', { name: 'Venue' });
    expect(picker.textContent).toBe('Courtside Arena');
    fireEvent.mouseDown(picker);
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Lotus Studio' }));

    await waitFor(() =>
      expect(lastSent(sent, 'PartnersNearbyHosts')).toEqual({
        venue_id: 'venue-2',
        search: { location_id: 'loc-blr', zone_name: 'Koramangala', radius_km: 5, category_ids: ['cat-yoga'] },
      }),
    );
    expect(lastSent(sent, 'PartnersPodRequestQuota')).toEqual({ side: 'VENUE', venue_id: 'venue-2' });
  });

  it('starts unfiltered for a venue with no category', async () => {
    const sent: SentOperation[] = [];
    mount(
      base({
        PartnersNearbySearchVenues: {
          myVenues: [myVenue({ venue_category: { __typename: 'VenueCategory', category_id: null } })],
        },
      }),
      sent,
    );

    await screen.findByRole('heading', { name: 'Kiran Shah' });
    expect(lastSent(sent, 'PartnersNearbyHosts')).toMatchObject({ search: { category_ids: [] } });
  });

  it('shows an existing request instead of Request Pod on that host', async () => {
    mount(base({ PartnersNearbyHosts: { nearbyHostsForVenue: [nearbyHost({ open_request_status: 'REQUESTED' })] } }));

    expect(await screen.findByText('Requested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request Pod' })).toBeNull();
  });

  it("disables Request Pod once the venue's allowance is spent", async () => {
    mount(base({ PartnersPodRequestQuota: quota(10, 0) }));

    expect(await screen.findByText('You have used all 10 Pod Requests for this month.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Request Pod' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('NearbyHostsPage — Request Pod', () => {
  it('sends the request with the note, closes the dialog and confirms', async () => {
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
    const dialog = await screen.findByRole('dialog', { name: 'Request Pod · Kiran Shah' });
    fireEvent.change(within(dialog).getByLabelText('Note (optional)'), { target: { value: 'Saturday mornings?' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request Pod' }));

    expect(await screen.findByText('Pod Request sent.')).toBeTruthy();
    expect(lastSent(sent, 'PartnersSendPodRequest')).toEqual({
      input: { direction: 'VENUE_TO_HOST', venue_id: 'venue-1', host_user_id: 'host-user-1', note: 'Saturday mornings?' },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Pod Request sent.')).toBeNull());
  });

  it('sends no note at all when the box is left empty', async () => {
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
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request Pod' }));

    await screen.findByText('Pod Request sent.');
    expect(lastSent(sent, 'PartnersSendPodRequest')).toMatchObject({ input: { note: null } });
  });

  it("keeps the dialog open with the server's LIMIT_REACHED refusal", async () => {
    mount(base({ PartnersSendPodRequest: new Error('LIMIT_REACHED: monthly Pod Request limit reached') }));

    fireEvent.click(await screen.findByRole('button', { name: 'Request Pod' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request Pod' }));

    expect(await within(dialog).findByText('LIMIT_REACHED: monthly Pod Request limit reached')).toBeTruthy();
    expect(screen.queryByText('Pod Request sent.')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes on Cancel without sending, and reopens clean', async () => {
    const sent: SentOperation[] = [];
    mount(base({ PartnersSendPodRequest: new Error('CONFLICT: a request is already open') }), sent);

    fireEvent.click(await screen.findByRole('button', { name: 'Request Pod' }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request Pod' }));
    await within(dialog).findByText('CONFLICT: a request is already open');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Request Pod' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('CONFLICT: a request is already open')).toBeNull();
    expect(sent.filter((op) => op.name === 'PartnersSendPodRequest')).toHaveLength(1);
  });
});
