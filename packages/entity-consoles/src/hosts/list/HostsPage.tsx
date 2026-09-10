import { useMemo } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from '@duncit/shell';
import ConsoleListPage from '../../shared/ConsoleListPage';
import { HOSTS_TABLE, type HostRow } from '../queries';
import { hostColumns } from './hostColumns';

/**
 * Hosts: every host on Duncit, application and approved alike.
 *
 * Built against the server's own `hostsTable`, so the search, the filters, the
 * sort and the paging are one query. A row opens the record; Add host opens the
 * same editor with nothing in it.
 */
export default function HostsPage() {
  const { t } = useTranslation();
  const columns = useMemo(() => hostColumns(t), [t]);

  return (
    <ConsoleListPage<HostRow>
      icon={<PersonIcon color="primary" />}
      title={t('directory.hosts.title')}
      subtitle={t('directory.hosts.subtitle')}
      addTo="/hosts/new"
      addLabel={t('directory.hostEditor.addHost')}
      document={HOSTS_TABLE}
      resultKey="hostsTable"
      columns={columns}
      tableId="hosts-console-list"
      emptyText={t('directory.hostEditor.listEmpty')}
      searchPlaceholder={t('directory.hostEditor.searchPlaceholder')}
      defaultSortField="created_at"
      rowPath={(row) => `/hosts/${row.id}`}
    />
  );
}
