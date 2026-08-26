import { AutoPodTicks } from '@duncit/auto-pods';
import {
  autoPodMissingRoles,
  autoPodTicks,
  shellAutoPodLabels,
  type AutoPodClubClaim,
  type AutoPodHostClaim,
  type AutoPodRow,
  type AutoPodVenueClaim,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface AutoPodMock {
  /** Whether each partner has enrolled yet — in any order. */
  venue_claimed: boolean;
  host_claimed: boolean;
  club_claimed: boolean;
}

/** The slice of a staging row the ticks and the "waiting for" line read. */
type TickRow = Pick<AutoPodRow, 'stage' | 'location' | 'venue_claim' | 'host_claim' | 'club_claim'>;

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
  const anyEnrolled = mock.venue_claimed || mock.host_claimed || mock.club_claimed;
  return {
    stage: anyEnrolled ? 'CLAIMING' : 'OPEN',
    location: null,
    venue_claim: mock.venue_claimed ? VENUE : null,
    host_claim: mock.host_claimed ? HOST : null,
    club_claim: mock.club_claimed ? CLUB : null,
  };
};

// The labels a surface injects; echoing the key back shows WHICH key each
// chip reads, which is the thing that silently drifts between surfaces.
const LABELS = shellAutoPodLabels((key: string) => key);

export default defineDemos('auto-pods', [
  defineDemo<AutoPodMock>({
    id: 'ticks',
    title: 'How far along an Auto Pod offer is, at a glance',
    note:
      'Flip host_claimed or club_claimed to true first — any partner may enrol first. The row is always three chips in the same order, so a card never changes width or reorders as partners enrol; the order is presentation, not a dependency.',
    mock: { venue_claimed: false, host_claimed: false, club_claimed: false },
    render: (mock) => <AutoPodTicks row={rowFrom(mock)} labels={LABELS} />,
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
]);
