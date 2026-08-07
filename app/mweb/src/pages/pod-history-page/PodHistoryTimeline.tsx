import { PodParticipationTimeline } from '@duncit/ui';
import { participationInputFrom } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import type { PodHistoryItem } from './queries';

/**
 * What happened to this booking.
 *
 * The renderer is the same one Finance and Admin draw, over the same nodes from
 * @duncit/utils — including the parts the old timeline could not express: no
 * refund state at all when nobody asked for one, an attendance state once the
 * pod has happened, and one branch per backout carrying the DUN-BKO id Finance
 * works from.
 */
export default function PodHistoryTimeline({ item }: Readonly<{ item: PodHistoryItem }>) {
  const { formatDateTime } = useDateFormat();

  return (
    <PodParticipationTimeline
      input={participationInputFrom(item.participation, item.pod?.pod_date_time)}
      formatDateTime={formatDateTime}
    />
  );
}
