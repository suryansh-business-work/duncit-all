import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getPortalAccessColumns } from './columns';
import type { PortalAccessRequest } from './helpers';

interface Props {
  t: (key: string) => string;
  fetchRows: TableFetch<PortalAccessRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  formatDateTime: (value: string) => string;
  onApprove: (row: PortalAccessRequest) => void;
  onDeny: (row: PortalAccessRequest) => void;
}

const getRowId = (row: PortalAccessRequest) => row.id;

export default function PortalAccessTable({
  t,
  fetchRows,
  refetchRef,
  formatDateTime,
  onApprove,
  onDeny,
}: Readonly<Props>) {
  const columns = useMemo(
    () => getPortalAccessColumns({ t, formatDateTime, onApprove, onDeny }),
    [t, formatDateTime, onApprove, onDeny]
  );

  return (
    <DuncitTable<PortalAccessRequest>
      tableId="admin-portal-access"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('admin.portalAccess.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('admin.portalAccess.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
