import { AutoPodDependencyTimeline, AutoPodTicks, VenueEarningsDialog } from '@duncit/auto-pods';
import {
  autoPodMissingRoles,
  autoPodRoleEarnings,
  autoPodSpaceEarnings,
  autoPodTicks,
  autoPodVenueSpaces,
  shellAutoPodLabels,
  type AutoPodClubClaim,
  type AutoPodHostClaim,
  type AutoPodRow,
  type AutoPodVenueClaim,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface AutoPodMock {
  /** Whether each partner has enrolled yet — venue, then host, then club admin. */
  venue_claimed: boolean;
  host_claimed: boolean;
  club_claimed: boolean;
  /** A virtual offer has no venue to enrol — two stops, not three. */
  virtual: boolean;
}

/** The slice of a staging row the ticks and the "waiting for" line read. */
type TickRow = Pick<
  AutoPodRow,
  'stage' | 'location' | 'pod_mode' | 'venue_claim' | 'host_claim' | 'club_claim'
>;

const VENUE: AutoPodVenueClaim = {
  venue_id: 'ven-2207',
  venue_slot_id: 'slot-88104',
  owner_user_id: 'u-3310',
  venue_name: 'Play Arena, Sarjapur',
  pod_date_time: '2026-09-06T07:00:00.000Z',
  pod_end_date_time: '2026-09-06T09:00:00.000Z',
  slot_price: 1200,
  accepted_at: '2026-08-27T10:12:00.000Z',
};

const HOST: AutoPodHostClaim = {
  user_id: 'u-1042',
  host_name: 'Asha Menon',
  assigned_at: '2026-08-26T16:40:00.000Z',
};

const CLUB: AutoPodClubClaim = {
  club_id: 'club-41',
  club_name: 'Koramangala Smashers',
  user_id: 'u-9',
  claimed_at: '2026-08-28T08:05:00.000Z',
};

/** A staging row, filled in only as far as the ticks below need it. */
const rowFrom = (mock: AutoPodMock): TickRow => {
  const venueClaimed = mock.venue_claimed && !mock.virtual;
  const anyEnrolled = venueClaimed || mock.host_claimed || mock.club_claimed;
  return {
    stage: anyEnrolled ? 'CLAIMING' : 'OPEN',
    location: null,
    pod_mode: mock.virtual ? 'VIRTUAL' : 'PHYSICAL',
    venue_claim: venueClaimed ? VENUE : null,
    host_claim: mock.host_claimed ? HOST : null,
    club_claim: mock.club_claimed ? CLUB : null,
  };
};

// The labels a surface injects; echoing the key back shows WHICH key each
// chip reads, which is the thing that silently drifts between surfaces.
const LABELS = shellAutoPodLabels((key: string) => key);

/** What a venue owner types into the potential-earnings calculator. */
interface VenueEarningsMock {
  /** The venue's published spaces, each with the seats it holds. */
  spaces: { label: string; capacity: number }[];
  /** The scalar capacity that stands in when the venue named no space. */
  capacity: number;
  /** A ticket price, to see the sum the dialog spells out. */
  ticket_price: number;
}

/** The three role figures a card could be handed for the SAME offer. */
interface RoleEarningsMock {
  expected_venue_earnings: number | null;
  expected_host_earnings: number | null;
  expected_club_earnings: number | null;
}

const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

/** The venue the calculator lists spaces for; only the capacity half matters. */
const venueFrom = (mock: VenueEarningsMock) => ({
  id: 'ven-2207',
  venue_name: 'Play Arena, Sarjapur',
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc-560103',
  city: 'Bengaluru',
  capacity: mock.capacity,
  capacity_items: mock.spaces,
  venue_category: null,
});

/** A row carrying nothing but the three role figures. */
const earningsRow = (mock: RoleEarningsMock) =>
  ({ ...rowFrom({ venue_claimed: true, host_claimed: true, club_claimed: false, virtual: false }), ...mock }) as AutoPodRow;

export default defineDemos('auto-pods', [
  defineDemo<AutoPodMock>({
    id: 'ticks',
    title: 'How far along an Auto Pod offer is, at a glance',
    note:
      'Flip venue_claimed, host_claimed or club_claimed to true — the chips are the card row; the line under them is the admin table Pod dependency cell, drawn from the same derivation: green with the partner name where they have enrolled, amber where the offer is still waiting. Every green stop is a button (onEnrolledClick gets the role) — that is how the admin opens the venue, host or club admin behind it. Set virtual to true and the venue stop disappears: a virtual offer waits on a host and a club only.',
    mock: { venue_claimed: false, host_claimed: false, club_claimed: false, virtual: false },
    render: (mock) => (
      <div style={{ display: 'grid', gap: 16 }}>
        <AutoPodTicks row={rowFrom(mock)} labels={LABELS} />
        <AutoPodDependencyTimeline row={rowFrom(mock)} labels={LABELS} onEnrolledClick={() => undefined} />
      </div>
    ),
    compute: (mock) => {
      const row = rowFrom(mock);
      const missing = autoPodMissingRoles(row);
      return {
        'Stage': row.stage,
        'autoPodTicks(row)': autoPodTicks(row),
        'autoPodMissingRoles(row)': missing,
        'Waiting for':
          missing.length > 0
            ? LABELS.waitingFor(missing)
            : 'nobody — this one materialises into a real Pod',
      };
    },
  }),

  defineDemo<VenueEarningsMock>({
    id: 'venue-earnings',
    title: 'What an Auto Pod could take at each of a venue\'s spaces',
    note:
      'Type a ticket price against a space and the dialog spells the sum out — "Potential Earnings (Ticket Price × Slots): ₹250 × 6 = ₹1,500". This is the pod\'s GROSS at that space, not the venue payout after Finance\'s deductions: a venue opens it to size the opportunity before accepting. Empty the spaces array and the venue\'s scalar capacity stands in as one unnamed space, which is what autoPodVenueSpaces() is for.',
    mock: {
      spaces: [
        { label: 'Court 1 (indoor)', capacity: 6 },
        { label: 'Rooftop turf', capacity: 20 },
      ],
      capacity: 40,
      ticket_price: 250,
    },
    render: (mock) => (
      <VenueEarningsDialog
        venue={venueFrom(mock)}
        labels={LABELS}
        open
        onClose={() => undefined}
        formatMoney={money}
      />
    ),
    compute: (mock) => {
      const spaces = autoPodVenueSpaces(venueFrom(mock));
      return {
        'autoPodVenueSpaces(venue)': spaces,
        'Per space at this price': spaces.map((space) => ({
          space: space.label || LABELS.earningsWholeVenue,
          earnings: autoPodSpaceEarnings(mock.ticket_price, space.capacity),
        })),
      };
    },
  }),

  defineDemo<RoleEarningsMock>({
    id: 'role-earnings',
    title: 'One card, three "You could earn" figures',
    note:
      'The three partners are paid for different things, so the card reads the figure for the role whose queue it is in — a venue was once shown the HOST\'s payout, which is a different number entirely. Null on a role means that partner has nothing to project yet (no booked slot, or no ticket price), and the card falls back to a bare "You could earn" beside its calculator.',
    mock: {
      expected_venue_earnings: 5000,
      expected_host_earnings: 3113,
      expected_club_earnings: 114.72,
    },
    compute: (mock) => {
      const row = earningsRow(mock);
      return {
        'Venue queue': autoPodRoleEarnings(row, 'venue'),
        'Host queue': autoPodRoleEarnings(row, 'host'),
        'Club Admin queue': autoPodRoleEarnings(row, 'club'),
        "A viewer's own calculator wins": autoPodRoleEarnings(row, 'host', 1500),
      };
    },
  }),
]);
