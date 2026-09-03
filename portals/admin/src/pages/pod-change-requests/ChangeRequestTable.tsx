import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { POD_CHANGE_REQUESTS_TABLE } from '@duncit/pod-change-requests';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import { buildChangeRequestColumns } from './columns';

const getRowId = (row: PodChangeRow) => row.id;

/** One tab's queue. The table id is per-role so an admin's column layout for
 * the venue queue does not follow them into the host one. */
const TABLE_ID: Record<PodChangeRole, string> = {
  VENUE: 'admin-change-requests-venue',
  HOST: 'admin-change-requests-host',
  CLUB_ADMIN: 'admin-change-requests-club-admin',
};

interface Props {
  role: PodChangeRole;
  onCancelPod: (row: PodChangeRow) => void;
  onAssign: (row: PodChangeRow) => void;
  /** The page keeps the handle so a mutation anywhere reloads this grid. */
  refetchRef: React.MutableRefObject<(() => void) | null>;
}

export default function ChangeRequestTable({
  role,
  onCancelPod,
  onAssign,
  refetchRef,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<PodChangeRow>(
    client,
    POD_CHANGE_REQUESTS_TABLE,
    'podChangeRequests',
    { extraVariables: { role } },
    [role]
  );

  const columns = useMemo<DuncitColumn<PodChangeRow>[]>(
    () => buildChangeRequestColumns({ role, t, onCancelPod, onAssign }),
    [role, t, onCancelPod, onAssign]
  );

  return (
    <DuncitTable<PodChangeRow>
      tableId={TABLE_ID[role]}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      refetchRef={refetchRef}
      emptyText={t('admin.changeRequests.empty')}
      searchPlaceholder={t('admin.changeRequests.searchPlaceholder')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
