import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import VenueBookingTermsCard from '../booking-terms/VenueBookingTermsCard';
import { bookingGuestsLabel, bookingPendingLabel } from '../booking-terms/BookingTermsAsk';
import { ADMIN_VENUE_BOOKING_TERMS, type VenueBookingTermsRow } from '../booking-terms/queries';
import { renderWithProviders } from '../../../../__tests__/testkit';

const row = (over: Partial<VenueBookingTermsRow> = {}) => ({
  __typename: 'VenueBookingTermsRow',
  slot_id: 's1',
  pod_id: 'pod1',
  pod_title: 'Sunday Brunch',
  start_at: '2026-11-08T05:30:00.000Z',
  end_at: '2026-11-08T08:30:00.000Z',
  status: 'PENDING',
  offer_status: 'SENT',
  model: 'PER_GUEST',
  rate: 300,
  min_guests: 8,
  max_guests: 20,
  offerings: ['A long table for 20', 'Projector', 'A long table for 20'],
  note: 'We would love the terrace.',
  round: 2,
  awaiting: 'VENUE',
  expires_at: '2026-11-01T12:30:00.000Z',
  venue_payout: 6000,
  platform_fee: 600,
  total: 6600,
  ...over,
});

const termsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: ADMIN_VENUE_BOOKING_TERMS, variables: { venue_id: 'v1' } },
  result: { data: { adminVenueBookingTerms: rows } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mount = (rows: unknown[]) => renderWithProviders(<VenueBookingTermsCard venueId="v1" />, { mocks: [termsMock(rows)] });

describe('VenueBookingTermsCard', () => {
  it('shows the ask behind a pending offer: guests, round, answer-by, what the venue provides and the note', async () => {
    mount([row()]);
    const ask = await screen.findByTestId('booking-terms-ask-s1');

    expect(within(ask).getByText('8–20 guests · Round 2')).toBeInTheDocument();
    expect(within(ask).getByText(/^Answer by /)).toBeInTheDocument();
    // A point said twice is listed once, under its label.
    const list = within(ask).getByRole('list', { name: 'What the venue provides' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'A long table for 20',
      'Projector',
    ]);
    expect(within(ask).getByText('Note on the terms')).toBeInTheDocument();
    expect(within(ask).getByText('We would love the terrace.')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the venue')).toBeInTheDocument();
  });

  it('says the booking waits on the host once the venue has countered', async () => {
    mount([row({ offer_status: 'COUNTERED', awaiting: 'HOST' })]);
    expect(await screen.findByText('Waiting for the host')).toBeInTheDocument();
  });

  // A booked slot is settled: there is no answer left to wait for.
  it('gives a booked booking no answer-by time and no waiting chip', async () => {
    mount([row({ status: 'BOOKED', offer_status: 'ACCEPTED', awaiting: null, expires_at: null })]);
    const ask = await screen.findByTestId('booking-terms-ask-s1');

    expect(within(ask).queryByText(/^Answer by /)).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for the venue')).not.toBeInTheDocument();
    expect(within(ask).getByText('8–20 guests · Round 2')).toBeInTheDocument();
  });

  // A booking made before offers carries no ask at all.
  it('shows no ask for a booking made before offers', async () => {
    mount([
      row({
        status: 'BOOKED',
        offer_status: null,
        min_guests: 0,
        max_guests: 0,
        offerings: [],
        note: '',
        round: 0,
        awaiting: null,
        expires_at: null,
      }),
    ]);
    const ask = await screen.findByTestId('booking-terms-ask-s1');

    expect(ask).toBeEmptyDOMElement();
  });

  it('says there are no bookings when the venue has none', async () => {
    mount([]);
    expect(await screen.findByText('No booking requests are waiting right now.')).toBeInTheDocument();
  });
});

describe('bookingGuestsLabel', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    `${key}${JSON.stringify(options?.vars ?? {})}`;

  it('reads a range from the minimum to the most guests', () => {
    expect(bookingGuestsLabel(t, 8, 20)).toBe('availability.offers.guestRange{"min":8,"max":20}');
  });

  it('reads one count when there is no smaller minimum', () => {
    expect(bookingGuestsLabel(t, 0, 20)).toBe('availability.offers.guests{"n":20}');
    expect(bookingGuestsLabel(t, 20, 20)).toBe('availability.offers.guests{"n":20}');
  });

  it('says nothing when the count is unknown', () => {
    expect(bookingGuestsLabel(t, 8, 0)).toBe('');
  });
});

describe('bookingPendingLabel', () => {
  const t = (key: string) => key;

  it('names whose move it is', () => {
    expect(bookingPendingLabel(t, 'HOST')).toBe('admin.venueBookingTerms.awaitingHost');
    expect(bookingPendingLabel(t, 'VENUE')).toBe('availability.offers.termsPending');
    expect(bookingPendingLabel(t, null)).toBe('availability.offers.termsPending');
  });
});

describe('VenueBookingTermsCard / a booking whose pod has no title', () => {
  it('shows a dash in the title’s place instead of leaving the row headless', async () => {
    mount([row({ pod_title: '' })]);
    const ask = await screen.findByTestId('booking-terms-ask-s1');

    const item = ask.closest('li');
    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Sunday Brunch')).not.toBeInTheDocument();
  });
});
