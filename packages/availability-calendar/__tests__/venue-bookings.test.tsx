import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import UpcomingBookings from '../src/bookings/UpcomingBookings';
import SlotRequestHistory from '../src/bookings/SlotRequestHistory';
import { MY_VENUE_SLOT_REQUEST_HISTORY, MY_VENUE_UPCOMING_BOOKINGS, type SlotRequestHistoryRow } from '../src/bookings/queries';

function mockOf(query: MockedResponse['request']['query'], answer: object, seen: Record<string, any>[] = [], delay?: number): MockedResponse {
  return {
    request: { query, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    delay,
    result: (variables: Record<string, any>) => {
      seen.push(variables);
      return answer as never;
    },
  };
}

const withApollo = (mocks: MockedResponse[], ui: ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );

const booking = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueBooking',
  slot_id: 'slot-1',
  venue_name: 'Skyline Banquets',
  pod_id: 'pod-1',
  pod_title: 'Pottery night',
  start_at: '2026-12-05T12:30:00.000Z',
  end_at: '2026-12-05T14:30:00.000Z',
  space_label: '',
  venue_payout: 4500,
  ...over,
});

const bookingsAnswer = (rows: unknown[]) => ({ data: { myVenueUpcomingBookings: rows } });

describe('UpcomingBookings', () => {
  it('shows a skeleton while loading', () => {
    withApollo([mockOf(MY_VENUE_UPCOMING_BOOKINGS, bookingsAnswer([]), [], 60_000)], <UpcomingBookings venueId="venue-1" />);
    expect(screen.getByLabelText('Loading upcoming bookings')).toHaveAttribute('aria-busy', 'true');
  });

  it('says when the bookings could not be loaded', async () => {
    withApollo([mockOf(MY_VENUE_UPCOMING_BOOKINGS, { errors: [new GraphQLError('boom')] })], <UpcomingBookings venueId="venue-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load upcoming bookings.");
  });

  it('says when nothing is booked yet', async () => {
    withApollo([mockOf(MY_VENUE_UPCOMING_BOOKINGS, bookingsAnswer([]))], <UpcomingBookings venueId="venue-1" />);
    expect(await screen.findByTestId('upcoming-bookings-empty')).toHaveTextContent('No upcoming bookings yet.');
  });

  it('lists one venue’s next bookings with exactly what the venue is paid', async () => {
    const seen: Record<string, any>[] = [];
    const rows = [booking(), booking({ slot_id: 'slot-2', pod_title: 'Board games', space_label: 'Terrace', venue_payout: 1250.5 })];
    withApollo([mockOf(MY_VENUE_UPCOMING_BOOKINGS, bookingsAnswer(rows), seen)], <UpcomingBookings venueId="venue-1" limit={3} />);
    const items = within(await screen.findByTestId('upcoming-bookings')).getAllByRole('listitem');

    expect(seen[0]).toEqual({ venue_id: 'venue-1', limit: 3 });
    expect(items[0]).toHaveTextContent('Pottery night');
    expect(items[0]).toHaveTextContent('₹4,500your payout');
    // One venue: no venue name, and nothing after the time without a space.
    expect(items[0]).not.toHaveTextContent('Skyline Banquets');
    expect(items[0].textContent).toMatch(/ – [^·]+₹4,500your payout$/);
    expect(items[1].textContent).toMatch(/ – [^·]+ · Terrace₹/);
    expect(items[1]).toHaveTextContent('₹1,250.50');
  });

  it("names each booking's venue when every venue is listed", async () => {
    const seen: Record<string, any>[] = [];
    const rows = [booking(), booking({ slot_id: 'slot-2', venue_name: 'Garden Court', space_label: 'Lawn' })];
    withApollo([mockOf(MY_VENUE_UPCOMING_BOOKINGS, bookingsAnswer(rows), seen)], <UpcomingBookings venueId={null} showVenue />);
    const items = within(await screen.findByTestId('upcoming-bookings')).getAllByRole('listitem');
    expect(seen[0]).toEqual({ venue_id: null, limit: 5 });
    expect(items[0]).toHaveTextContent(/ · Skyline Banquets₹/);
    expect(items[1]).toHaveTextContent(/ · Garden Court · Lawn₹/);
  });
});

const historyRow = (over: Partial<SlotRequestHistoryRow> = {}) => ({
  __typename: 'VenueSlotRequestHistoryRow',
  slot_id: 'slot-1',
  venue_name: 'Skyline Banquets',
  pod_title: 'Pottery night',
  start_at: '2026-10-05T12:30:00.000Z',
  end_at: '2026-10-05T14:30:00.000Z',
  status: 'BOOKED',
  decision: 'APPROVED',
  decided_at: null,
  decline_reason: '',
  ...over,
});
const historyAnswer = (rows: unknown[]) => ({ data: { myVenueSlotRequestHistory: rows } });

describe('SlotRequestHistory', () => {
  const rows = [
    historyRow({ slot_id: 'pending', pod_title: 'Yoga at dawn', status: 'PENDING', decision: '' }),
    historyRow({ slot_id: 'approved', decided_at: '2026-10-01T09:00:00.000Z' }),
    historyRow({ slot_id: 'declined', pod_title: 'Late jam', status: 'AVAILABLE', decision: 'DECLINED', decline_reason: 'Too noisy' }),
  ];

  it('shows a skeleton while loading', () => {
    withApollo([mockOf(MY_VENUE_SLOT_REQUEST_HISTORY, historyAnswer([]), [], 60_000)], <SlotRequestHistory venueId="venue-1" />);
    expect(screen.getByLabelText('Loading answered requests')).toBeInTheDocument();
  });

  it('says when the history could not be loaded', async () => {
    withApollo([mockOf(MY_VENUE_SLOT_REQUEST_HISTORY, { errors: [new GraphQLError('boom')] })], <SlotRequestHistory venueId="venue-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the answered requests.");
  });

  it('explains instant booking and says when there is no history', async () => {
    withApollo([mockOf(MY_VENUE_SLOT_REQUEST_HISTORY, historyAnswer([]))], <SlotRequestHistory venueId="venue-1" />);
    const history = await screen.findByTestId('slot-request-history');
    expect(history).toHaveTextContent('Booking requests you have answered.');
    expect(history).toHaveTextContent('No answered booking requests yet.');
  });

  it('shows each outcome, and keeps approve / decline on a request still pending', async () => {
    const seen: Record<string, any>[] = [];
    const renderPendingAction = vi.fn((row: SlotRequestHistoryRow) => <button type="button">{`Approve ${row.pod_title}`}</button>);
    withApollo([mockOf(MY_VENUE_SLOT_REQUEST_HISTORY, historyAnswer(rows), seen)], <SlotRequestHistory venueId="venue-1" renderPendingAction={renderPendingAction} />);
    const items = within(await screen.findByTestId('slot-request-history')).getAllByRole('listitem');

    expect(seen[0]).toEqual({ venue_id: 'venue-1', limit: 100 });
    expect(screen.queryByText('No answered booking requests yet.')).not.toBeInTheDocument();
    expect(within(items[0]).getByText('Pending')).toBeInTheDocument();
    expect(within(items[0]).getByRole('button', { name: 'Approve Yoga at dawn' })).toBeInTheDocument();
    expect(renderPendingAction).toHaveBeenCalledWith(expect.objectContaining({ slot_id: 'pending' }));
    expect(renderPendingAction).not.toHaveBeenCalledWith(expect.objectContaining({ slot_id: 'approved' }));

    expect(within(items[1]).getByText('Approved')).toBeInTheDocument();
    expect(items[1]).toHaveTextContent(/Decided .+/);
    expect(within(items[1]).queryByRole('button')).not.toBeInTheDocument();

    expect(within(items[2]).getByText('Declined')).toBeInTheDocument();
    expect(items[2]).toHaveTextContent('Reason: Too noisy');
    expect(items[2]).not.toHaveTextContent('Decided');
  });

  it('lists a pending request read-only when nothing answers it', async () => {
    withApollo([mockOf(MY_VENUE_SLOT_REQUEST_HISTORY, historyAnswer(rows))], <SlotRequestHistory venueId={null} />);
    const items = within(await screen.findByTestId('slot-request-history')).getAllByRole('listitem');
    expect(within(items[0]).getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('leaves pending requests out when the page lists them elsewhere', async () => {
    withApollo([mockOf(MY_VENUE_SLOT_REQUEST_HISTORY, historyAnswer(rows))], <SlotRequestHistory venueId="venue-1" hidePending />);
    await waitFor(() => expect(within(screen.getByTestId('slot-request-history')).getAllByRole('listitem')).toHaveLength(2));
    expect(screen.queryByText('Yoga at dawn')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });
});
