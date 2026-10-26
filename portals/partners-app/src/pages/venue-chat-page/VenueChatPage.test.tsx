import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenueChatPage from './VenueChatPage';
import { partnerUser, renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import {
  at,
  line,
  liveOffer,
  offerLine,
  ownLine,
  readMark,
  room,
  venueCard,
  venueCounter,
} from '../../__tests__/venue-chat-fixtures';

afterEach(cleanup);

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<VenueChatPage />, {
    route: '/venues/pods/pod-1/chat',
    path: '/venues/pods/:podId/chat',
    link: scriptedLink({ MarkVenueChatRead: { markVenueChatRead: true }, ...answers }, sent),
    user: partnerUser({ user_id: 'u-venue' }),
  });

describe('VenueChatPage — who is on the other side', () => {
  it('opens both sides’ details from the Contact button, each with a phone to dial and an email to write to', async () => {
    mount({
      VenueChatRoom: room(),
      VenueChatMessages: { venueChatMessages: [line('t1')] },
      PodVenueOfferTerms: { podVenueOffer: null },
    });
    expect(await screen.findByRole('heading', { name: 'Chat · Pottery night' })).toBeTruthy();
    // The sheet is closed until asked for — the thread is what the page opens on.
    expect(screen.queryByTestId('venue-chat-host-card')).toBeNull();

    fireEvent.click(screen.getByTestId('venue-chat-contact-open'));
    const sheet = within(await screen.findByRole('dialog', { name: 'Host and venue details' }));
    const host = within(sheet.getByTestId('venue-chat-host-card'));
    expect(host.getByRole('heading', { name: 'Asha Rao' })).toBeTruthy();
    expect(host.getByText('@asha')).toBeTruthy();
    expect(host.getByText('Runs pottery evenings in Indiranagar.')).toBeTruthy();
    expect(host.getByRole('link', { name: 'Phone +91 98000 00000' }).getAttribute('href')).toBe('tel:+919800000000');
    expect(host.getByRole('link', { name: 'Email asha@host.test' }).getAttribute('href')).toBe('mailto:asha@host.test');

    const venue = within(sheet.getByTestId('venue-chat-venue-card'));
    expect(venue.getByRole('heading', { name: 'Skyline Banquets' })).toBeTruthy();
    expect(venue.getByText('Banquet hall · Up to 120 guests')).toBeTruthy();
    expect(venue.getByText('12 Residency Road, Bengaluru')).toBeTruthy();
    expect(venue.getByText('Ask for Ravi')).toBeTruthy();
    expect(venue.getByRole('link', { name: 'Phone +91 97000 00000' }).getAttribute('href')).toBe('tel:+919700000000');
    // The console opens no profile or venue page from the sheet.
    expect(screen.queryByTestId('venue-chat-host-card-action')).toBeNull();
    expect(screen.queryByTestId('venue-chat-venue-card-action')).toBeNull();

    fireEvent.click(sheet.getByTestId('venue-chat-contact-close'));
    await waitFor(() => expect(screen.queryByTestId('venue-chat-host-card')).toBeNull());
    expect(screen.getByText('Is the terrace free?')).toBeTruthy();
  });

  it('shows only the venue when no host is on record, and says when there is no way to reach it', async () => {
    mount({
      VenueChatRoom: room({ host: null, venue: venueCard({ phone: '', email: '', name: '', capacity: 0 }) }),
      VenueChatMessages: { venueChatMessages: [] },
      PodVenueOfferTerms: { podVenueOffer: null },
    });
    fireEvent.click(await screen.findByTestId('venue-chat-contact-open'));
    const sheet = within(await screen.findByRole('dialog', { name: 'Host and venue details' }));
    expect(sheet.queryByTestId('venue-chat-host-card')).toBeNull();
    const venue = within(sheet.getByTestId('venue-chat-venue-card'));
    expect(venue.getByText('No phone or email on record')).toBeTruthy();
    // No capacity and no named contact: neither line is written as an empty phrase.
    expect(venue.getByText('Banquet hall')).toBeTruthy();
    expect(venue.queryByText(/^Ask for/)).toBeNull();
    expect(venue.queryByRole('link')).toBeNull();
  });
});

describe('VenueChatPage — booking offers in the thread', () => {
  it("pins where the host's offer stands and lets the venue answer it for its round", async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        VenueChatRoom: room(),
        VenueChatMessages: { venueChatMessages: [line('t1'), offerLine('m1', { event: 'OFFER', by: 'HOST' })] },
        PodVenueOfferTerms: { podVenueOffer: liveOffer({ host_counters_used: 1 }) },
        AcceptVenueOffer: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 'slot-1', status: 'BOOKED' } },
      },
      sent,
    );
    expect(await screen.findByText('Is the terrace free?')).toBeTruthy();

    const pin = within(await screen.findByRole('status', { name: 'Booking offer' }));
    expect(pin.getByTestId('venue-offer-pin-status').textContent).toBe('Your move');
    expect(pin.getByText(/^Answer by /)).toBeTruthy();
    expect(pin.getByTestId('venue-offer-pin-counters').textContent).toBe('You: 3 of 3 counters left · Host: 2 of 3 left');

    const card = within(await screen.findByRole('article', { name: 'New booking offer' }));
    expect(card.getByText(/^You receive/).textContent).toContain('₹2,400 – ₹6,000');
    expect(card.getByText('Note from the host')).toBeTruthy();
    expect(card.getByTestId('offer-line-time').textContent).toMatch(/^Sent /);
    fireEvent.click(await card.findByTestId('offer-accept-slot-1'));
    fireEvent.click(within(screen.getByRole('dialog')).getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent.find((op) => op.name === 'AcceptVenueOffer')?.variables).toEqual({ slot_id: 'slot-1', round: 1 }));
    // The answer re-reads the live offer.
    await waitFor(() => expect(sent.filter((op) => op.name === 'PodVenueOfferTerms').length).toBeGreaterThanOrEqual(2));
  });

  it("gives a host reading the thread here their answers to the venue's counter, but no new-offer button", async () => {
    mount({
      VenueChatRoom: room({ my_side: 'HOST' }),
      VenueChatMessages: {
        venueChatMessages: [offerLine('m1', { event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000, note: '' })],
      },
      PodVenueOfferTerms: {
        podVenueOffer: liveOffer({ status: 'COUNTERED', awaiting: 'HOST', round: 2, counter: venueCounter() }),
      },
    });
    const card = within(await screen.findByRole('article', { name: 'The venue countered' }));
    expect(await card.findByTestId('host-offer-accept')).toBeTruthy();
    expect(card.getByText(/^Costs the pod/)).toBeTruthy();
    expect(screen.queryByTestId('offer-send-new')).toBeNull();
    // The host's own counters are named as theirs, the venue's as the venue's.
    expect(screen.getByTestId('venue-offer-pin-counters').textContent).toBe('You: 3 of 3 counters left · Venue: 3 of 3 left');
  });

  it('keeps an offer line it cannot draw as its text, and pins nothing without a live offer', async () => {
    mount({
      VenueChatRoom: room(),
      VenueChatMessages: { venueChatMessages: [offerLine('m1', { event: 'WITHDRAWN', by: 'HOST' })] },
      PodVenueOfferTerms: { podVenueOffer: null },
    });
    expect(await screen.findByText('Booking offer')).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.queryByTestId('venue-offer-pin')).toBeNull();
  });
});

describe('VenueChatPage — how far the host has read', () => {
  it("draws the host's face under the last line they read, from the room's read marks", async () => {
    mount({
      VenueChatRoom: room({
        read_marks: [readMark('u-host', 'HOST', 'Asha Rao', at(3)), readMark('u-venue', 'VENUE', 'Ravi', at(9))],
      }),
      VenueChatMessages: { venueChatMessages: [line('t1'), ownLine('o1', { createdAt: at(2) }), ownLine('o2', { text: 'See you then', createdAt: at(8) })] },
      PodVenueOfferTerms: { podVenueOffer: null },
    });
    const seen = await screen.findByRole('img', { name: 'Seen by Asha Rao' });
    expect(seen.closest('li')?.textContent).toContain('Yes, from 6 pm.');
    // One face: never the reader's own, and none under a line nobody has reached.
    expect(screen.getAllByTestId('seen-faces')).toHaveLength(1);
    expect(screen.getByText('See you then').closest('li')?.querySelector('[data-testid="seen-faces"]')).toBeNull();
  });
});
