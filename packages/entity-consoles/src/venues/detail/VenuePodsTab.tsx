import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import EntityPodsTab from '../../shared/EntityPodsTab';
import { RECORD_PODS_TABLE, recordPodColumns, type RecordPodRow } from '../../shared/recordPods';

/** Every pod booked at this venue — `venue_id` is one of the pods table's
 * allowlisted filters, so no second query exists for this list. A row opens the
 * pod's own details page. */
export default function VenuePodsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const columns = useMemo(() => recordPodColumns(t), [t]);

  return (
    <EntityPodsTab<RecordPodRow>
      filterField="venue_id"
      filterValue={venueId}
      document={RECORD_PODS_TABLE}
      columns={columns}
      tableId="admin-venue-pods"
      title={t('admin.venueDetails.podsTitle')}
      subtitle={t('admin.venueDetails.podsSubtitle')}
      emptyText={t('admin.venueDetails.podsEmpty')}
    />
  );
}
