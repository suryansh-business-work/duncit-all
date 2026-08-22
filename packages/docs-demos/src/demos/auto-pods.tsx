import { AutoPodTicks } from '@duncit/auto-pods';
import { autoPodTicks, autoPodWaitingOn, shellAutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface AutoPodMock {
  /** Whether each partner has enrolled yet. */
  venue_claimed: boolean;
  host_claimed: boolean;
  club_claimed: boolean;
}

/** A staging row, filled in only as far as the ticks below need it. */
const rowFrom = (mock: AutoPodMock): AutoPodRow =>
  ({
    venue_claim: mock.venue_claimed ? { venue_id: 'v-1' } : null,
    host_claim: mock.host_claimed ? { host_id: 'h-1' } : null,
    club_claim: mock.club_claimed ? { club_id: 'c-1' } : null,
  }) as unknown as AutoPodRow;

// The labels a surface injects; echoing the key back shows WHICH key each
// chip reads, which is the thing that silently drifts between surfaces.
const LABELS = shellAutoPodLabels((key: string) => key);

export default defineDemos('auto-pods', [
  defineDemo<AutoPodMock>({
    id: 'ticks',
    title: 'How far along an Auto Pod offer is, at a glance',
    note:
      'Flip venue_claimed to true. The row is always three chips in the same order, so a card never changes width as partners enrol — and the venue always goes first, because nothing can be claimed until a date exists.',
    mock: { venue_claimed: false, host_claimed: false, club_claimed: false },
    render: (mock) => <AutoPodTicks row={rowFrom(mock)} labels={LABELS} />,
    compute: (mock) => {
      const row = rowFrom(mock);
      return {
        'autoPodTicks(row)': autoPodTicks(row),
        'Waiting on': autoPodWaitingOn(row) ?? 'nobody — this one materialises into a real Pod',
        'Why venue first':
          'A host cannot claim a date the venue has not committed, so the order is the dependency, not a preference.',
      };
    },
  }),
]);
