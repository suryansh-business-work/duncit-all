import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import EntityRecordsTab from '../../shared/EntityRecordsTab';
import { HOSTS_TABLE, type HostRow } from '../../hosts/queries';
import { hostColumns } from '../../hosts/list/hostColumns';

interface Props {
  clubId: string;
  /** The ACCOUNT ids `Club.hosts` resolves — its linked hosts, or the hosts of
   * its pods when none are linked. */
  hostUserIds: string[];
}

/**
 * The club's hosts, as the hosts console lists them — same query, same columns —
 * scoped with `user_id in [...]`. A row opens the host's full record inside the
 * club, editable from there.
 */
export default function ClubHostsTab({ clubId, hostUserIds }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => hostColumns(t), [t]);

  return (
    <EntityRecordsTab<HostRow>
      document={HOSTS_TABLE}
      resultKey="hostsTable"
      filter={{ field: 'user_id', op: 'in', values: hostUserIds }}
      columns={columns}
      tableId="clubs-console-hosts"
      title={t('directory.clubs.hostsTitle')}
      subtitle={t('directory.clubs.hostsSubtitle')}
      emptyText={t('directory.clubs.hostsEmpty')}
      defaultSortField="created_at"
      rowPath={(host) => `/clubs/${clubId}/hosts/${host.id}`}
    />
  );
}
