import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import PodRequestDetailPage from '../PodRequestDetailPage';
import { urlConfigs } from '../../../../config/url-configs';
import { renderWithProviders } from '../../../../__tests__/render';
import {
  STAY_PENDING,
  scriptedLink,
  type ScriptedAnswer,
  type SentOperation,
} from '../../../../__tests__/groupC-link';
import { hostSummary, requestDetail, requestSlot, venueSlot } from '../../__tests__/fixtures';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

type Side = 'HOST' | 'VENUE';

const detail = (over: Record<string, unknown> = {}) => ({ podPartnerRequest: requestDetail(over) });

const mount = (answers: Record<string, ScriptedAnswer>, side: Side = 'HOST', sent: SentOperation[] = []) => {
  const base = side === 'HOST' ? '/host' : '/venues';
  return renderWithProviders(<PodRequestDetailPage side={side} />, {
    link: scriptedLink(answers, sent),
    route: `${base}/pod-requests/req-1`,
    path: `${base}/pod-requests/:id`,
  });
};

const mutationResult = (field: string, status: string) => ({
  [field]: { __typename: 'PodPartnerRequest', id: 'req-1', status },
});

const sentVariables = (sent: SentOperation[], name: string) => sent.find((op) => op.name === name)?.variables;

describe('PodRequestDetailPage — loading and failure', () => {
  it('announces loading while the request is fetched', () => {
    mount({ PartnersPodRequest: STAY_PENDING });

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('pod-request-detail')).toBeNull();
  });

  it('shows the server error with a retry that asks again', async () => {
    const sent: SentOperation[] = [];
    mount({ PartnersPodRequest: new Error('You are not part of this request') }, 'HOST', sent);

    expect(await screen.findByText('You are not part of this request')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Pod Requests' }).getAttribute('href')).toBe('/host/pod-requests');
    const before = sent.filter((op) => op.name === 'PartnersPodRequest').length;

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() =>
      expect(sent.filter((op) => op.name === 'PartnersPodRequest').length).toBeGreaterThan(before),
    );
    expect(sentVariables(sent, 'PartnersPodRequest')).toEqual({ id: 'req-1' });
  });

  it('says the request was not found when the server answers nothing', async () => {
    mount({ PartnersPodRequest: { podPartnerRequest: null } }, 'VENUE');

    expect(await screen.findByText('This Pod Request could not be found.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Pod Requests' }).getAttribute('href')).toBe(
      '/venues/pod-requests',
    );
  });
});

describe('PodRequestDetailPage — who it is with', () => {
  it('shows a host the venue: type, capacity, place, distance, status and the note', async () => {
    mount({ PartnersPodRequest: detail({ note: 'Weekend doubles league?' }) });

    const card = within(await screen.findByTestId('pod-request-detail'));
    expect(card.getByText('Venue')).toBeTruthy();
    expect(card.getByRole('heading', { name: 'Courtside Arena' })).toBeTruthy();
    expect(card.getByText('Badminton · Indoor')).toBeTruthy();
    expect(card.getByText('Capacity 40')).toBeTruthy();
    expect(card.getByText('Indiranagar, Bengaluru')).toBeTruthy();
    expect(card.getByText('2.5 km away')).toBeTruthy();
    expect(card.getByText('Requested')).toBeTruthy();
    expect(card.getByRole('heading', { name: 'Note' })).toBeTruthy();
    expect(card.getByText('Weekend doubles league?')).toBeTruthy();
  });

  it('shows a venue owner the host and their categories, leaving out an unknown distance', async () => {
    mount(
      {
        PartnersPodRequest: detail({
          direction: 'HOST_TO_VENUE',
          viewer_side: 'VENUE',
          distance_km: null,
          host: hostSummary({ name: 'Meera Iyer' }),
        }),
      },
      'VENUE',
    );

    const card = within(await screen.findByTestId('pod-request-detail'));
    expect(card.getByText('Host')).toBeTruthy();
    expect(card.getByRole('heading', { name: 'Meera Iyer' })).toBeTruthy();
    expect(card.getByText('Badminton, Yoga')).toBeTruthy();
    expect(card.queryByText(/km away/)).toBeNull();
    expect(card.queryByRole('heading', { name: 'Note' })).toBeNull();
  });

  it('leaves out a zero capacity and a missing category rather than printing blanks', async () => {
    mount({
      PartnersPodRequest: detail({
        venue: { ...requestDetail().venue, capacity: 0, category: '', venue_type: 'Outdoor', locality: '', city: 'Pune' },
      }),
    });

    const card = within(await screen.findByTestId('pod-request-detail'));
    expect(card.getByText('Outdoor')).toBeTruthy();
    expect(card.getByText('Pune')).toBeTruthy();
    expect(card.queryByText(/Capacity/)).toBeNull();
  });
});

describe('PodRequestDetailPage — the next step', () => {
  it('lets the receiving host accept, sending accept=true for this request', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersPodRequest: detail(),
        PartnersRespondPodRequest: mutationResult('respondPodPartnerRequest', 'ACCEPTED'),
      },
      'HOST',
      sent,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(sentVariables(sent, 'PartnersRespondPodRequest')).toEqual({ id: 'req-1', accept: true }));
    expect(screen.getByText('Contact details are shared once the pod is created.')).toBeTruthy();
  });

  it('lets the receiving host decline', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersPodRequest: detail(),
        PartnersRespondPodRequest: mutationResult('respondPodPartnerRequest', 'REJECTED'),
      },
      'HOST',
      sent,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(sentVariables(sent, 'PartnersRespondPodRequest')).toEqual({ id: 'req-1', accept: false }));
  });

  it('lets the sender withdraw while the request waits for an answer', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersPodRequest: detail({ direction: 'HOST_TO_VENUE' }),
        PartnersCancelPodRequest: mutationResult('cancelPodPartnerRequest', 'CANCELLED'),
      },
      'HOST',
      sent,
    );

    expect(await screen.findByText('Waiting for the other side to answer.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => expect(sentVariables(sent, 'PartnersCancelPodRequest')).toEqual({ id: 'req-1' }));
  });

  it("shows the server's refusal above the request and keeps the step on screen", async () => {
    mount({
      PartnersPodRequest: detail({ direction: 'HOST_TO_VENUE' }),
      PartnersCancelPodRequest: new Error('Only a pending request can be withdrawn'),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));

    expect(await screen.findByText('Only a pending request can be withdrawn')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Only a pending request can be withdrawn')).toBeNull());
  });

  it("has the receiving venue pick one of its slots and send it", async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersPodRequest: detail({ direction: 'HOST_TO_VENUE', viewer_side: 'VENUE', status: 'ACCEPTED' }),
        PartnersPodRequestVenueSlots: { venueAvailableSlots: [venueSlot()] },
        PartnersRequestPodRequestSlot: mutationResult('requestPodPartnerSlot', 'SLOT_REQUESTED'),
      },
      'VENUE',
      sent,
    );

    expect(await screen.findByRole('heading', { name: 'Pick a slot' })).toBeTruthy();
    const send = screen.getByRole('button', { name: 'Send Slot Request' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(sentVariables(sent, 'PartnersPodRequestVenueSlots')).toEqual({ venue_id: 'venue-1' });

    fireEvent.click(await screen.findByTestId('slot-tile-open-1'));
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() =>
      expect(sentVariables(sent, 'PartnersRequestPodRequestSlot')).toEqual({ id: 'req-1', slot_id: 'open-1' }),
    );
  });

  it('has the sender wait while the other side picks a slot', async () => {
    mount({ PartnersPodRequest: detail({ status: 'ACCEPTED', viewer_side: 'VENUE' }) }, 'VENUE');

    expect(await screen.findByText('Waiting for the other side to pick a slot.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Pick a slot' })).toBeNull();
  });

  it('shows the requested slot and lets the sender confirm it', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersPodRequest: detail({ status: 'SLOT_REQUESTED', viewer_side: 'VENUE', slot: requestSlot() }),
        PartnersRespondPodRequestSlot: mutationResult('respondPodPartnerSlot', 'SLOT_CONFIRMED'),
      },
      'VENUE',
      sent,
    );

    expect(await screen.findByRole('heading', { name: 'Slot' })).toBeTruthy();
    expect(screen.getByText('Court 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm slot' }));

    await waitFor(() =>
      expect(sentVariables(sent, 'PartnersRespondPodRequestSlot')).toEqual({ id: 'req-1', confirm: true }),
    );
  });

  it('lets the sender decline the slot', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        PartnersPodRequest: detail({ status: 'SLOT_REQUESTED', viewer_side: 'VENUE', slot: requestSlot() }),
        PartnersRespondPodRequestSlot: mutationResult('respondPodPartnerSlot', 'ACCEPTED'),
      },
      'VENUE',
      sent,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Decline slot' }));

    await waitFor(() =>
      expect(sentVariables(sent, 'PartnersRespondPodRequestSlot')).toEqual({ id: 'req-1', confirm: false }),
    );
  });

  it('has the picker wait for confirmation and names a whole-venue slot', async () => {
    mount({ PartnersPodRequest: detail({ status: 'SLOT_REQUESTED', slot: requestSlot({ space_label: '' }) }) });

    expect(await screen.findByText('Waiting for the other side to confirm the slot.')).toBeTruthy();
    expect(screen.getByText('Whole venue')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm slot' })).toBeNull();
  });

  it("sends the host to the app's Create Pod with this request once the slot is confirmed", async () => {
    mount({ PartnersPodRequest: detail({ status: 'SLOT_CONFIRMED', slot: requestSlot() }) });

    expect(
      await screen.findByText('The slot is confirmed. Create the pod: the venue and slot are already chosen.'),
    ).toBeTruthy();
    const create = screen.getByRole('link', { name: 'Create Pod' });
    expect(create.getAttribute('href')).toBe(`${urlConfigs.mwebUrl}/create-pod?partner_request_id=req-1`);
    expect(create.getAttribute('target')).toBe('_blank');
    expect(create.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('tells the venue that the host creates the pod', async () => {
    mount(
      { PartnersPodRequest: detail({ status: 'SLOT_CONFIRMED', viewer_side: 'VENUE', slot: requestSlot() }) },
      'VENUE',
    );

    expect(await screen.findByText('The slot is confirmed. The host creates the pod next.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Create Pod' })).toBeNull();
  });

  it('shares contact details and View pod only once the pod exists', async () => {
    mount({
      PartnersPodRequest: detail({
        status: 'POD_CREATED',
        pod_id: 'pod-7',
        slot: requestSlot(),
        contact: {
          __typename: 'PartnerContact',
          phone: '+919800000001',
          email: 'arena@duncit.com',
          address: '12 Park Road',
        },
      }),
    });

    expect(await screen.findByRole('heading', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '+919800000001' }).getAttribute('href')).toBe('tel:+919800000001');
    expect(screen.getByRole('link', { name: 'arena@duncit.com' }).getAttribute('href')).toBe('mailto:arena@duncit.com');
    expect(screen.getByText(/12 Park Road/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View pod' }).getAttribute('href')).toBe('/host/pods');
    expect(screen.queryByText('Contact details are shared once the pod is created.')).toBeNull();
  });

  it('shows only the contact lines the server sent', async () => {
    mount({
      PartnersPodRequest: detail({
        status: 'POD_CREATED',
        contact: { __typename: 'PartnerContact', phone: '+919800000001', email: '', address: null },
      }),
    });

    expect(await screen.findByRole('link', { name: '+919800000001' })).toBeTruthy();
    expect(screen.queryByText(/Email/)).toBeNull();
    expect(screen.queryByText(/Address/)).toBeNull();
  });

  it('offers nothing to do on a closed request and keeps contact hidden', async () => {
    mount({ PartnersPodRequest: detail({ status: 'EXPIRED' }) });

    expect(await screen.findByText('Expired')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Accept|Withdraw|Confirm slot|Send Slot Request/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Create Pod|View pod/ })).toBeNull();
    expect(screen.getByText('Contact details are shared once the pod is created.')).toBeTruthy();
  });
});
