import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import PodRequestsPage from '../PodRequestsPage';
import { renderWithProviders } from '../../../__tests__/render';
import {
  STAY_PENDING,
  scriptedLink,
  type ScriptedAnswer,
  type SentOperation,
} from '../../../__tests__/groupC-link';
import { hostSummary, requestRow, venueSummary } from './fixtures';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

/** A host's lists: one new request, one accepted, one declined, one the host sent. */
const hostRequests = [
  requestRow({ id: 'req-new', venue: { ...requestRow().venue, id: 'v-new', venue_name: 'Courtside Arena' } }),
  requestRow({
    id: 'req-acc',
    status: 'ACCEPTED',
    venue: { ...requestRow().venue, id: 'v-acc', venue_name: 'Lakeview Studio', locality: '', city: 'Pune' },
  }),
  requestRow({ id: 'req-gone', status: 'REJECTED', venue: { ...requestRow().venue, id: 'v-gone', venue_name: 'Old Hall' } }),
  requestRow({
    id: 'req-sent',
    direction: 'HOST_TO_VENUE',
    venue: { ...requestRow().venue, id: 'v-sent', venue_name: 'Rooftop Commons' },
  }),
];

const list = (rows: readonly unknown[]) => ({ myPodPartnerRequests: rows });

const mount = (
  answers: Record<string, ScriptedAnswer>,
  { side = 'HOST' as 'HOST' | 'VENUE', route = '/host/pod-requests', sent = [] as SentOperation[] } = {},
) =>
  renderWithProviders(<PodRequestsPage side={side} />, {
    link: scriptedLink(answers, sent),
    route,
  });

const rows = () => screen.getAllByTestId('pod-request-row');

describe('PodRequestsPage', () => {
  it('shows a skeleton, not empty lists, while the requests load', () => {
    mount({ PartnersMyPodRequests: STAY_PENDING });

    expect(screen.queryByRole('heading', { name: 'Pod Requests from Venues' })).toBeNull();
    expect(screen.queryByText('No new Pod Requests yet.')).toBeNull();
  });

  it("splits a host's requests into the Requests tab and the sent list, dropping declined ones", async () => {
    const sent: SentOperation[] = [];
    mount({ PartnersMyPodRequests: list(hostRequests) }, { sent });

    expect(await screen.findByRole('heading', { name: 'Pod Requests from Venues' })).toBeTruthy();
    expect(sent.find((op) => op.name === 'PartnersMyPodRequests')?.variables).toEqual({ side: 'HOST' });

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('link', { name: 'Courtside Arena' }).getAttribute('href')).toBe(
      '/host/pod-requests/req-new',
    );
    expect(within(panel).getByText(/Indiranagar, Bengaluru · Requested on/)).toBeTruthy();
    expect(within(panel).getByText('Requested')).toBeTruthy();
    expect(within(panel).queryByText('Lakeview Studio')).toBeNull();
    expect(screen.queryByText('Old Hall')).toBeNull();

    expect(screen.getByRole('heading', { name: 'Your requests to venues' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Rooftop Commons' })).toBeTruthy();
    // Only the Requests tab offers inline answers; the sent row has none.
    expect(within(panel).getByRole('button', { name: 'Accept' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
  });

  it('links to the venue search from the host studio', async () => {
    mount({ PartnersMyPodRequests: list([]) });

    const search = await screen.findByRole('link', { name: 'Search Nearby Venues' });
    expect(search.getAttribute('href')).toBe('/host/nearby-venues');
  });

  it('switches to the accepted tab and records it in the URL', async () => {
    mount({ PartnersMyPodRequests: list(hostRequests) });

    fireEvent.click(await screen.findByRole('tab', { name: 'Venue Accepted Requests' }));

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/host/pod-requests?selectedtab_podrequests=accepted'),
    );
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('link', { name: 'Lakeview Studio' })).toBeTruthy();
    // A partial place still reads cleanly — no dangling comma.
    expect(within(panel).getByText(/^Pune · Requested on/)).toBeTruthy();
    expect(within(panel).getByText('Accepted')).toBeTruthy();
    expect(within(panel).queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  it('opens on the tab named in the URL', async () => {
    mount(
      { PartnersMyPodRequests: list(hostRequests) },
      { route: '/host/pod-requests?selectedtab_podrequests=accepted' },
    );

    const panel = await screen.findByRole('tabpanel');
    expect(await within(panel).findByText('Lakeview Studio')).toBeTruthy();
    expect(within(panel).queryByText('Courtside Arena')).toBeNull();
  });

  it('says why each list is empty', async () => {
    mount({ PartnersMyPodRequests: list([]) }, { route: '/host/pod-requests' });

    expect(await screen.findByText('No new Pod Requests yet.')).toBeTruthy();
    expect(screen.getByText('Requests you send appear here.')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Venue Accepted Requests' }));
    expect(await screen.findByText('Requests you accept appear here.')).toBeTruthy();
  });

  it("words the venue studio for hosts and shows the host with the owner's venue", async () => {
    const venueSide = [
      requestRow({ id: 'req-v', direction: 'HOST_TO_VENUE', viewer_side: 'VENUE' }),
      requestRow({
        id: 'req-v2',
        direction: 'VENUE_TO_HOST',
        viewer_side: 'VENUE',
        host: { ...requestRow().host, user_id: 'h2', name: 'Meera Iyer' },
      }),
    ];
    mount({ PartnersMyPodRequests: list(venueSide) }, { side: 'VENUE', route: '/venues/pod-requests' });

    expect(await screen.findByRole('heading', { name: 'Pod Requests from Hosts' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Host Accepted Requests' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your requests to hosts' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Search Nearby Hosts' }).getAttribute('href')).toBe('/venues/nearby-hosts');

    const incoming = within(screen.getByRole('tabpanel'));
    expect(incoming.getByRole('link', { name: hostSummary().name }).getAttribute('href')).toBe(
      '/venues/pod-requests/req-v',
    );
    expect(incoming.getByText(new RegExp(`^${venueSummary().venue_name} · Requested on`))).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Meera Iyer' })).toBeTruthy();
  });

  it('accepts inline, then shows the request on the accepted tab', async () => {
    const sent: SentOperation[] = [];
    let answered = false;
    mount(
      {
        PartnersMyPodRequests: () =>
          list(answered ? [requestRow({ id: 'req-new', status: 'ACCEPTED' })] : [requestRow({ id: 'req-new' })]),
        PartnersRespondPodRequest: (variables) => {
          answered = true;
          return {
            respondPodPartnerRequest: { __typename: 'PodPartnerRequest', id: variables.id, status: 'ACCEPTED' },
          };
        },
      },
      { sent },
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    expect(await screen.findByText('No new Pod Requests yet.')).toBeTruthy();
    expect(sent.find((op) => op.name === 'PartnersRespondPodRequest')?.variables).toEqual({
      id: 'req-new',
      accept: true,
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Venue Accepted Requests' }));
    expect(await within(screen.getByRole('tabpanel')).findByText('Courtside Arena')).toBeTruthy();
  });

  it('declines inline with accept=false', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersMyPodRequests: list([requestRow({ id: 'req-new' })]),
        PartnersRespondPodRequest: {
          respondPodPartnerRequest: { __typename: 'PodPartnerRequest', id: 'req-new', status: 'REJECTED' },
        },
      },
      { sent },
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));

    await waitFor(() =>
      expect(sent.find((op) => op.name === 'PartnersRespondPodRequest')?.variables).toEqual({
        id: 'req-new',
        accept: false,
      }),
    );
  });

  it("shows the server's refusal of an answer and lets it be dismissed", async () => {
    mount({
      PartnersMyPodRequests: list([requestRow({ id: 'req-new' })]),
      PartnersRespondPodRequest: new Error('This request was withdrawn'),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    const alert = await screen.findByText('This request was withdrawn');
    // The request stays where it was.
    expect(screen.getByRole('link', { name: 'Courtside Arena' })).toBeTruthy();
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('This request was withdrawn')).toBeNull());
  });

  it('reports a failed load instead of claiming the lists are empty', async () => {
    mount({ PartnersMyPodRequests: new Error('Not a host') });

    expect(await screen.findByText('Not a host')).toBeTruthy();
  });
});
