import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApolloLink } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';
import SlotDecisionPage from './SlotDecisionPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const slot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlotDecision',
  slot_id: 's1',
  venue_id: 'v1',
  venue_name: 'Court House',
  start_at: '2026-08-02T10:00:00.000Z',
  end_at: '2026-08-02T12:00:00.000Z',
  whole_day: false,
  price: 1000,
  space_label: 'Court 2',
  requested_at: '2026-07-20T09:00:00.000Z',
  pod_id: 'pod1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles, all levels.',
  host_name: 'Asha Rao',
  host_email: 'asha@host.example.com',
  host_phone: '9000000001',
  decision: 'NONE',
  decided_at: null,
  decline_reason: '',
  venue_commission_pct: 10,
  venue_commission_amount: 100,
  venue_receives: 900,
  pod_is_free: false,
  // A request from before booking offers: the email's approve / decline answer it.
  offer: null,
  ...over,
});

const decision = (row: unknown) => ({ venueSlotDecision: row });

const mount = (answers: Record<string, ScriptedAnswer>, search = '', sent: SentOperation[] = []) =>
  renderWithProviders(<SlotDecisionPage />, {
    route: `/venues/requests/s1${search}`,
    path: '/venues/requests/:slotId',
    link: scriptedLink(answers, sent),
  });

const approved = slot({ decision: 'APPROVED', decided_at: '2026-07-21T10:00:00.000Z' });

describe('SlotDecisionPage states', () => {
  it('calls a host with no name on record a host', async () => {
    mount({ VenueSlotDecision: decision(slot({ host_name: '' })) });
    expect(await screen.findByText('Hosted by a host')).toBeTruthy();
  });

  it('shows a spinner, then a pending request with the money the venue would earn', async () => {
    mount({ VenueSlotDecision: decision(slot()) });
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(await screen.findByText('Sunday Badminton')).toBeTruthy();
    expect(screen.getByText('Awaiting your decision')).toBeTruthy();
    expect(screen.getByText('Court House · Court 2')).toBeTruthy();
    expect(screen.getByText('Hosted by Asha Rao')).toBeTruthy();
    // The hero figure and the take-home row both carry it.
    expect(screen.getAllByText('₹900.00')).toHaveLength(2);
    expect(screen.getByText('Your earning from this booking')).toBeTruthy();
    expect(screen.queryByTestId('slot-request-free-pod-notice')).toBeNull();
    expect(screen.getByRole('button', { name: 'Approve booking' })).toBeTruthy();
  });

  it('shows a free pod’s request with the coordinate-with-the-host notice instead of any earning', async () => {
    mount({
      VenueSlotDecision: decision(
        slot({ pod_is_free: true, price: 0, venue_commission_amount: 0, venue_receives: 0 }),
      ),
    });
    const notice = await screen.findByTestId('slot-request-free-pod-notice');
    expect(notice.getAttribute('role')).toBe('status');
    expect(screen.getByText('This pod is free')).toBeTruthy();
    expect(screen.getByText(/The host will contact you about your charges/)).toBeTruthy();
    expect(screen.queryByText('Your earning from this booking')).toBeNull();
    expect(screen.queryByText(/₹/)).toBeNull();
    // The host's contact sits beside the notice, and the decision stays open.
    expect(screen.getByRole('link', { name: '9000000001' }).getAttribute('href')).toBe('tel:9000000001');
    expect(screen.getByRole('button', { name: 'Approve booking' })).toBeTruthy();
  });

  it('warns when the request cannot be found', async () => {
    mount({ VenueSlotDecision: decision(null) });
    expect(await screen.findByText('This booking request could not be found.')).toBeTruthy();
  });

  it('shows the load failure', async () => {
    mount({ VenueSlotDecision: new Error('Decision unavailable') });
    expect(await screen.findByText('Decision unavailable')).toBeTruthy();
  });

  it('shows an approved booking as confirmed, with no buttons left', async () => {
    mount({ VenueSlotDecision: decision(approved) });
    expect(await screen.findByText('Booking confirmed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve booking' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
  });

  it('shows a declined booking with the reason the host was given and the earning passed on', async () => {
    mount({ VenueSlotDecision: decision(slot({ decision: 'DECLINED', decline_reason: 'Under renovation' })) });
    expect(await screen.findByText('Booking declined')).toBeTruthy();
    expect(screen.getByText(/Under renovation/)).toBeTruthy();
    expect(screen.getByText('Earning you passed on')).toBeTruthy();
  });

  it('goes to the list of all requests', async () => {
    mount({ VenueSlotDecision: decision(approved) });
    fireEvent.click(await screen.findByRole('button', { name: 'See all slot requests' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/venues/requests'));
  });
});

describe('SlotDecisionPage approve', () => {
  it('approves from the button and reloads the outcome', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(slot()), ApproveVenueSlotRequest: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'BOOKED' } } }, '', sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve booking' }));
    await waitFor(() => expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(true));
    expect(sent.find((op) => op.name === 'ApproveVenueSlotRequest')?.variables).toEqual({ slot_id: 's1' });
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotDecision').length).toBeGreaterThan(1));
  });

  it('approves on arrival, once, when the email button asked for it', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(slot()), ApproveVenueSlotRequest: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'BOOKED' } } }, '?action=approve', sent);
    await screen.findByText('Sunday Badminton');
    await waitFor(() => expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(true));
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotDecision').length).toBeGreaterThan(1));
    expect(sent.filter((op) => op.name === 'ApproveVenueSlotRequest')).toHaveLength(1);
  });

  it('does not approve on arrival once the request is already decided', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(approved) }, '?action=approve', sent);
    await screen.findByText('Booking confirmed');
    expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(false);
  });

  it('shows the refusal of an approval', async () => {
    mount({ VenueSlotDecision: decision(slot()), ApproveVenueSlotRequest: new Error('Slot was taken') });
    fireEvent.click(await screen.findByRole('button', { name: 'Approve booking' }));
    expect(await screen.findByText('Slot was taken')).toBeTruthy();
  });
});

describe('SlotDecisionPage decline', () => {
  it('needs a reason, then declines with it', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(slot()), DeclineVenueSlotRequest: { declineVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'AVAILABLE' } } }, '', sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    const submit = screen.getByRole('button', { name: 'Decline booking' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const reason = screen.getByTestId('slot-decline-reason').querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(reason, { target: { value: '  Closed that day  ' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(sent.some((op) => op.name === 'DeclineVenueSlotRequest')).toBe(true));
    expect(sent.find((op) => op.name === 'DeclineVenueSlotRequest')?.variables).toEqual({ slot_id: 's1', reason: 'Closed that day' });
    await waitFor(() => expect(screen.queryByTestId('slot-decline-reason')).toBeNull());
  });

  it('opens the reason form on arrival from the email’s Decline button and can be put away', async () => {
    mount({ VenueSlotDecision: decision(slot()) }, '?action=decline');
    expect(await screen.findByTestId('slot-decline-reason')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it pending' }));
    await waitFor(() => expect(screen.queryByTestId('slot-decline-reason')).toBeNull());
    expect(screen.getByRole('button', { name: 'Approve booking' })).toBeTruthy();
  });

  it('shows the refusal of a decline and keeps the form', async () => {
    mount({ VenueSlotDecision: decision(slot()), DeclineVenueSlotRequest: new Error('Already decided') }, '?action=decline');
    const reason = (await screen.findByTestId('slot-decline-reason')).querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(reason, { target: { value: 'No' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline booking' }));
    expect(await screen.findByText('Already decided')).toBeTruthy();
    expect(screen.getByTestId('slot-decline-reason')).toBeTruthy();
  });
});

/** A quote of the host's terms, as the server prices them (BREAKDOWN_FIELDS). */
const quote = (pax: number, venuePayout: number, total: number) => ({
  __typename: 'VenuePriceBreakdown',
  model: 'PER_PAX',
  rate: 300,
  pax,
  hours: 2,
  date: '2026-08-02',
  base: venuePayout,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: venuePayout,
  gst_pct: 0,
  taxes: 0,
  venue_payout: venuePayout,
  platform_fee_pct: 10,
  platform_fee: total - venuePayout,
  total,
  deposit: 0,
});

/** A host's per-guest offer for 8 to 20 guests, waiting on the venue in its second round. */
const offer = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueBookingOffer',
  slot_id: 's1',
  status: 'SENT',
  round: 2,
  awaiting: 'VENUE',
  model: 'PER_GUEST',
  rate: 300,
  pax: 20,
  min_guests: 8,
  offerings: ['A long table for 20', 'Projector'],
  note: 'We would love the terrace.',
  pets: false,
  space_label: 'Court 2',
  expires_at: '2026-07-21T09:00:00.000Z',
  quote: quote(20, 6000, 6600),
  quote_min: quote(8, 2400, 2640),
  counter: null,
  history: [
    {
      __typename: 'VenueOfferHistoryEntry',
      by: 'HOST',
      action: 'OFFER',
      model: 'PER_GUEST',
      rate: 300,
      min_guests: 8,
      total: 6600,
      note: '',
      at: '2026-07-20T09:00:00.000Z',
    },
  ],
  ...over,
});

const offerRequest = (over: Record<string, unknown> = {}) => slot({ offer: offer(over) });

/** The venue's answer refused because the host moved first — the server's CAS guard. */
const offerChangedLink = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[]) =>
  ApolloLink.split(
    (operation) => operation.operationName === 'AcceptVenueOffer',
    new ApolloLink((operation) => {
      sent.push({ name: operation.operationName ?? '', variables: operation.variables });
      return new Observable((observer) => {
        Promise.resolve().then(() => {
          observer.next({
            errors: [
              {
                message: 'This offer was just answered or changed — refresh to see where it stands',
                extensions: { code: 'CONFLICT', reason: 'OFFER_CHANGED' },
              } as never,
            ],
          });
          observer.complete();
        });
      });
    }),
    scriptedLink(answers, sent),
  );

describe('SlotDecisionPage offer', () => {
  it('shows what the host asks: guests, the money as a range, what the venue provides, the note and the answer-by time', async () => {
    mount({ VenueSlotDecision: decision(offerRequest()) });

    expect((await screen.findByTestId('offer-guests')).textContent).toBe('8–20 guests');
    const money = screen.getByTestId('offer-money').textContent ?? '';
    expect(money).toContain('₹2,400');
    expect(money).toContain('₹6,000');
    const ask = screen.getByTestId('offer-ask');
    expect(within(ask).getByText('A long table for 20')).toBeTruthy();
    expect(within(ask).getByText('Projector')).toBeTruthy();
    expect(within(ask).getByText('We would love the terrace.')).toBeTruthy();
    expect(screen.getByTestId('offer-answer-by')).toBeTruthy();
    // An offer is answered with its own Accept / Counter / Reject, not the one-tap approve.
    expect(screen.queryByRole('button', { name: 'Approve booking' })).toBeNull();
  });

  it('reads one guest count, and says pets are coming, when there is no smaller minimum', async () => {
    mount({ VenueSlotDecision: decision(offerRequest({ min_guests: 0, pets: true })) });

    expect((await screen.findByTestId('offer-guests')).textContent).toBe('20 guests · Pets are coming');
  });

  it('does not accept an offer on arrival from the email link — the venue reads the terms first', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(offerRequest()) }, '?action=approve', sent);

    await screen.findByTestId('offer-guests');
    expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest' || op.name === 'AcceptVenueOffer')).toBe(false);
  });

  it('accepts the offer with the round it read and re-reads the outcome', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        VenueSlotDecision: decision(offerRequest()),
        AcceptVenueOffer: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'BOOKED' } },
      },
      '',
      sent,
    );
    fireEvent.click(await screen.findByTestId('offer-accept-s1'));
    fireEvent.click(await screen.findByTestId('answer-offer-submit'));

    await waitFor(() => expect(sent.some((op) => op.name === 'AcceptVenueOffer')).toBe(true));
    expect(sent.find((op) => op.name === 'AcceptVenueOffer')?.variables).toEqual({ slot_id: 's1', round: 2 });
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotDecision').length).toBeGreaterThan(1));
  });

  // The host countered while the venue was reading: nothing was accepted, the
  // venue is told the terms changed, and the page re-reads the latest terms.
  it('says the terms changed and re-reads the request when the host moved first', async () => {
    const notices: string[] = [];
    const listen = (event: Event) => notices.push((event as CustomEvent<{ message: string }>).detail.message);
    globalThis.window.addEventListener('duncit:notify', listen);
    const sent: SentOperation[] = [];
    renderWithProviders(<SlotDecisionPage />, {
      route: '/venues/requests/s1',
      path: '/venues/requests/:slotId',
      link: offerChangedLink({ VenueSlotDecision: decision(offerRequest()) }, sent),
    });

    fireEvent.click(await screen.findByTestId('offer-accept-s1'));
    fireEvent.click(await screen.findByTestId('answer-offer-submit'));

    await waitFor(() =>
      expect(notices).toContain('The terms changed while you were reading them. Here are the latest.'),
    );
    expect(sent.find((op) => op.name === 'AcceptVenueOffer')?.variables).toEqual({ slot_id: 's1', round: 2 });
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotDecision').length).toBeGreaterThan(1));
    globalThis.window.removeEventListener('duncit:notify', listen);
  });
});
