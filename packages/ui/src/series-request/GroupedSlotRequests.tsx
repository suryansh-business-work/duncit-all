import type { ReactNode } from 'react';
import { groupSlotRequestsBySeries } from '@duncit/utils';
import { SeriesRequestGroup, type SeriesRequestRow } from './SeriesRequestGroup';
import type { SeriesRequestLabels } from './labels';

export interface GroupedSlotRequestsProps<T extends SeriesRequestRow> {
  requests: readonly T[];
  busy: boolean;
  labels: SeriesRequestLabels;
  formatWhen: (iso: string) => string;
  /** One request's own card — a one-time pod, or one date of a series. */
  renderRow: (row: T) => ReactNode;
  /** Answer every still-pending date of a series at once. */
  onDecideSeries: (seriesId: string, approve: boolean, reason?: string) => void;
}

/**
 * A venue's slot request list: ordinary requests as their own cards, and each
 * recurring pod's dates folded into one `SeriesRequestGroup`. The list mWeb's
 * and the Partners console's Slot Requests pages both render.
 */
export function GroupedSlotRequests<T extends SeriesRequestRow>({
  requests,
  busy,
  labels,
  formatWhen,
  renderRow,
  onDecideSeries,
}: Readonly<GroupedSlotRequestsProps<T>>) {
  return (
    <>
      {groupSlotRequestsBySeries(requests, (r) => r.slot_id).map((group) =>
        group.kind === 'SERIES' ? (
          <SeriesRequestGroup
            key={group.key}
            rows={group.rows}
            labels={labels}
            formatWhen={formatWhen}
            busy={busy}
            onApproveAll={() => onDecideSeries(group.seriesId, true)}
            onDeclineAll={(reason) => onDecideSeries(group.seriesId, false, reason)}
            renderRow={renderRow}
          />
        ) : (
          renderRow(group.row)
        )
      )}
    </>
  );
}
