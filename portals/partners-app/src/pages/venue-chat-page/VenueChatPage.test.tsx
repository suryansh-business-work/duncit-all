import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenueChatPage from './VenueChatPage';
import { partnerUser, renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const START = '2026-12-05T12:30:00.000Z';
const END = '2026-12-05T14:30:00.000Z';

const breakdown = (venue_payout: number, total: number, pax: number) => ({
  __typename: 'VenuePriceBreakdown',
  model: 'PER_PAX',
  rate: 300,
  pax,
  hours: 2,
  date: '2026-12-05',
  base: venue_payout,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: venue_payout,
  gst_pct: 0,
  taxes: 0,
  venue_payout,
  platform_fee_pct: 10,
  platform_fee: total - venue_payout,
  total,
  deposit: 0,
});

const liveOffer = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueBookingOffer',
  slot_id: 'slot-1',
  status: 'SENT',
  round: 1,
  awaiting: 'VENUE',
  model: 'PER_GUEST',
  rate: 300,
  pax: 20,
  min_guests: 8,
  offerings: ['10 chairs'],
  note: '',
  pets: false,
  space_label: '',
  expires_at: '2026-12-02T06:30:00.000Z',
  quote: breakdown(6000, 6600, 20),
  quote_min: breakdown(2400, 2640, 8),
  counter: null,
  pod_id: 'pod-1',
  start_at: START,
  end_at: END,
  ...over,
});

const move = (over: Record<string, unknown>) => ({
  __typename: 'VenueChatOffer',
  slot_id: 'slot-1',
  round: 1,
  event: 'OFFER',
  by: 'HOST',
  model: 'PER_GUEST',
  rate: 300,
  min_guests: 8,
  max_guests: 20,
  offerings: ['10 chairs'],
  note: 'We will bring our own speakers.',
  start_at: START,
  end_at: END,
  space_label: '',
  pets: false,
  venue_receives_min: 2400,
  venue_receives_max: 6000,
  total_min: 2640,
  total_max: 6600,
  expires_at: '2026-12-02T06:30:00.000Z',
  reason: '',
  ...over,
});

const line = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'PodMessage',
  id,
  pod_id: 'pod-1',
  user_id: 'u-host',
  user_name: 'Asha',
  user_photo: null,
  type: 'TEXT',
  text: 'Is the terrace free?',
  image_url: null,
  deleted: false,
  createdAt: '2026-12-01T06:00:00.000Z',
  offer: null,
  ...over,
});

const offerLine = (id: string, over: Record<string, unknown>) =>
  line(id, { type: 'OFFER', text: 'Booking offer', createdAt: '2026-12-01T06:05:00.000Z', offer: move(over) });

const room = (over: Record<string, unknown> = {}) => ({
  venueChatRoom: {
    __typename: 'VenueChatRoom',
    pod_id: 'pod-1',
    pod_title: 'Pottery night',
    pod_date_time: START,
    venue_id: 'venue-1',
    venue_name: 'Skyline Banquets',
    venue_photo: null,
    my_side: 'VENUE',
    counterpart_name: 'Asha',
    counterpart_phone: '+91 98000 00000',
    counterpart_email: 'asha@host.test',
    ...over,
  },
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<VenueChatPage />, {
    route: '/venues/pods/pod-1/chat',
    path: '/venues/pods/:podId/chat',
    link: scriptedLink(answers, sent),
    user: partnerUser({ user_id: 'u-venue' }),
  });

describe('VenueChatPage — booking offers in the thread', () => {
  it("says how to reach the host, and lets the venue answer the host's open offer for its round", async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        VenueChatRoom: room(),
        VenueChatMessages: { venueChatMessages: [line('t1'), offerLine('m1', { event: 'OFFER', by: 'HOST' })] },
        PodVenueOfferTerms: { podVenueOffer: liveOffer() },
        AcceptVenueOffer: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 'slot-1', status: 'BOOKED' } },
      },
      sent,
    );
    expect((await screen.findByRole('link', { name: 'Phone +91 98000 00000' })).getAttribute('href')).toBe('tel:+919800000000');
    expect(screen.getByRole('link', { name: 'Email asha@host.test' }).getAttribute('href')).toBe('mailto:asha@host.test');
    expect(await screen.findByText('Is the terrace free?')).toBeTruthy();

    const card = within(await screen.findByRole('article', { name: 'New booking offer' }));
    expect(card.getByText(/^You receive/).textContent).toContain('₹2,400 – ₹6,000');
    expect(card.getByText('Note from the host')).toBeTruthy();
    fireEvent.click(await card.findByTestId('offer-accept-slot-1'));
    fireEvent.click(within(screen.getByRole('dialog')).getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent.find((op) => op.name === 'AcceptVenueOffer')?.variables).toEqual({ slot_id: 'slot-1', round: 1 }));
    // The answer re-reads the live offer.
    await waitFor(() => expect(sent.filter((op) => op.name === 'PodVenueOfferTerms').length).toBeGreaterThanOrEqual(2));
  });

  it("gives a host reading the thread here their answers to the venue's counter, but no new-offer button", async () => {
    mount({
      VenueChatRoom: room({ my_side: 'HOST', counterpart_phone: null, counterpart_email: null }),
      VenueChatMessages: {
        venueChatMessages: [
          offerLine('m1', { event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000, note: '' }),
        ],
      },
      PodVenueOfferTerms: {
        podVenueOffer: liveOffer({
          status: 'COUNTERED',
          awaiting: 'HOST',
          round: 2,
          counter: {
            __typename: 'VenueOfferCounter',
            model: 'FLAT',
            rate: 7000,
            min_guests: 0,
            offerings: [],
            note: '',
            at: null,
            quote: breakdown(7000, 7700, 20),
            quote_min: breakdown(7000, 7700, 20),
          },
        }),
      },
    });
    const card = within(await screen.findByRole('article', { name: 'The venue countered' }));
    expect(await card.findByTestId('host-offer-accept')).toBeTruthy();
    expect(card.getByText(/^Costs the pod/)).toBeTruthy();
    expect(screen.queryByTestId('venue-chat-contact')).toBeNull();
  });

  it('keeps an offer line it cannot draw as its text', async () => {
    mount({
      VenueChatRoom: room(),
      VenueChatMessages: { venueChatMessages: [offerLine('m1', { event: 'WITHDRAWN', by: 'HOST' })] },
      PodVenueOfferTerms: { podVenueOffer: null },
    });
    expect(await screen.findByText('Booking offer')).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
  });
});
