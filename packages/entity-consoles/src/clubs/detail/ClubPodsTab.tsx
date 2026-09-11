import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import EntityPodsTab from '../../shared/EntityPodsTab';
import { RECORD_PODS_TABLE, recordPodColumns, type RecordPodRow } from '../../shared/recordPods';

/**
 * Every pod this club runs — `club_id` is an allowlisted `podsTable` filter, so
 * this is the pods engine the venue's list reads, with the same columns. A row
 * opens the pod, editable from there.
 */
export default function ClubPodsTab({ clubId }: Readonly<{ clubId: string }>) {
  const { t } = useTranslation();
  const columns = useMemo(() => recordPodColumns(t), [t]);

  return (
    <EntityPodsTab<RecordPodRow>
      filterField="club_id"
      filterValue={clubId}
      document={RECORD_PODS_TABLE}
      columns={columns}
      tableId="clubs-console-pods"
      title={t('directory.clubs.podsTitle')}
      subtitle={t('directory.clubs.podsSubtitle')}
      emptyText={t('directory.clubs.podsEmpty')}
    />
  );
}
