import {
  HOST_FREE_SPOT_NOTE,
  formatMoney,
  payableSpots,
  payingSeats,
  mwebTicketDiscountLabels,
  nextTicketDiscountTier,
  resolveTicketDiscountTier,
  ticketDiscountFor,
  ticketDiscountInput,
  ticketDiscountMaxTickets,
  ticketDiscountRows,
  ticketDiscountTierIssues,
  DEFAULT_TICKET_DISCOUNT_MAX_PCT,
  TICKET_DISCOUNT_MAX_TIERS,
  podSeatsTaken,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { SpotsMock, SeatsSoldMock, TicketDiscountMock } from './mocks';
import { mwebT } from './translators';

export const podMoneyDemos: PackageDemo[] = [
  defineDemo<SpotsMock>({
    id: 'host-free-spot',
    title: 'The host sits in the pod and never pays',
    note:
      'Change total_spots: every money figure on the platform bills one seat fewer, because the host occupies one of them.',
    mock: { total_spots: 8, price_per_spot: 450 },
    compute: (mock) => {
      const payable = payableSpots(mock.total_spots);
      return {
        'payableSpots(total_spots)': payable,
        'Seats billed': `${payable} of ${mock.total_spots}`,
        'Pod earns': formatMoney(payable * mock.price_per_spot),
        'If the host were billed too': formatMoney(mock.total_spots * mock.price_per_spot),
        'The rule, in words': HOST_FREE_SPOT_NOTE,
      };
    },
  }),

  defineDemo<SeatsSoldMock>({
    id: 'seats-not-people',
    title: 'Ten seats sold to three people',
    note:
      'seats_taken is the server’s attendees + extra_seats. Set it to 3 — the length of pod_attendees, which is what every table used to count — and watch both the occupancy and the revenue collapse to a third of the truth: one buyer who took seven seats appears in that list exactly once.',
    mock: {
      pod_attendees: ['host-1', 'u-prakhar', 'u-sangini'],
      pod_hosts_id: ['host-1'],
      seats_taken: 10,
      price_per_seat: 500,
    },
    compute: (mock) => ({
      'podSeatsTaken(pod)': podSeatsTaken(mock),
      'Bookings (pod_attendees.length)': mock.pod_attendees.length,
      'payingSeats(pod, hosts)': payingSeats(mock, mock.pod_hosts_id),
      'Pod collected': formatMoney(payingSeats(mock, mock.pod_hosts_id) * mock.price_per_seat),
      'If bookings were billed instead': formatMoney(
        (mock.pod_attendees.length - mock.pod_hosts_id.length) * mock.price_per_seat,
      ),
    }),
  }),

  defineDemo<TicketDiscountMock>({
    id: 'multi-ticket-discount',
    title: 'Four tickets in one booking, 20% off the tickets',
    note:
      'Change seats: the best tier the booking reaches applies to the ticket money only, before any coupon or coins. Set a tier’s discount_pct above 50, or make a row ask for fewer tickets than the one above, and the issues list names the row and the rule. Flip is_free and the input sent to the server clears the offer.',
    mock: {
      pod_id: 'DUN-POD-4821',
      pod_amount: 499,
      no_of_spots: 12,
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 2, discount_pct: 10 },
        { min_tickets: 4, discount_pct: 20 },
      ],
      seats: 4,
      is_free: false,
    },
    compute: (mock) => {
      const quote = ticketDiscountFor(mock.pod_amount, mock.seats, mock);
      const maxTickets = ticketDiscountMaxTickets(mock.no_of_spots);
      const labels = mwebTicketDiscountLabels(mwebT);
      const limits = { maxPct: DEFAULT_TICKET_DISCOUNT_MAX_PCT, maxTickets, maxTiers: TICKET_DISCOUNT_MAX_TIERS };
      const issues = ticketDiscountTierIssues({
        enabled: mock.ticket_discount_enabled,
        tiers: mock.ticket_discount_tiers,
        maxPct: DEFAULT_TICKET_DISCOUNT_MAX_PCT,
        maxTickets,
      });
      return {
        'resolveTicketDiscountTier(pod, seats)': resolveTicketDiscountTier(mock, mock.seats),
        'ticketDiscountFor(pod_amount, seats, pod)': quote,
        'Ticket gross': formatMoney(quote.gross),
        'Multi-ticket discount': formatMoney(quote.amount),
        'Tickets cost (the coupon evaluates on this)': formatMoney(quote.net),
        'Offer rows': ticketDiscountRows(mock.pod_amount, mock).map(
          (row) => `${row.min_tickets}+ · ${row.discount_pct}% · ${formatMoney(row.per_ticket)}`,
        ),
        'ticketDiscountMaxTickets(no_of_spots)': maxTickets,
        'Issues, worded': issues.map((issue) => labels.errors[issue.code](limits)),
        'Add tier would append': nextTicketDiscountTier(
          mock.ticket_discount_tiers,
          DEFAULT_TICKET_DISCOUNT_MAX_PCT,
        ),
        'ticketDiscountInput(values, is_free)': ticketDiscountInput(mock, mock.is_free),
      };
    },
  }),

];
