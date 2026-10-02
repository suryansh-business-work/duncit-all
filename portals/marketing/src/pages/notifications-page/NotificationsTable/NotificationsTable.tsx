import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { NotificationRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';
import {
  ScopeChip,
  getNotificationRowId,
  renderBody,
  renderDelivered,
  renderFailed,
  renderTitle,
  scopeLabel,
  scopeOptions,
  type LocName,
} from './cells';

interface Props {
  fetchRows: TableFetch<NotificationRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  locName: LocName;
  locationOptions: ReadonlyArray<{ value: string; label: string }>;
  toolbarActions?: ReactNode;
  onDelete: (n: NotificationRow) => void;
}

export default function NotificationsTable({
  fetchRows,
  refetchRef,
  locName,
  locationOptions,
  toolbarActions,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<NotificationRow>[]>(() => {
    const renderScope = (n: NotificationRow) => <ScopeChip notification={n} locName={locName} />;
    const renderActions = (n: NotificationRow) => (
      <Tooltip title={t('shell.common.delete')}>
        <DuncitIconButton size="small" onClick={() => onDelete(n)}>
          <DeleteIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    );
    return [
      {
        field: 'title',
        headerName: t('shell.common.title'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderTitle,
        valueGetter: (n) => n.title,
      },
      {
        field: 'body',
        headerName: t('marketing.notifications.body'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderBody,
        valueGetter: (n) => n.body,
      },
      {
        field: 'scope',
        headerName: t('marketing.common.audience'),
        minWidth: 180,
        type: 'enum',
        options: scopeOptions(t),
        cellRenderer: renderScope,
        valueGetter: (n) => scopeLabel(n, locName, t),
      },
      {
        field: 'delivered_count',
        headerName: t('marketing.notifications.delivered'),
        width: 110,
        type: 'number',
        cellRenderer: renderDelivered,
        valueGetter: (n) => n.delivered_count,
      },
      {
        field: 'failed_count',
        headerName: t('marketing.common.failed'),
        width: 100,
        type: 'number',
        cellRenderer: renderFailed,
        valueGetter: (n) => n.failed_count,
      },
      dateColumn<NotificationRow>({
        headerName: t('marketing.common.sent'),
        hide: false,
        width: 160,
        format: 'd MMM yyyy, HH:mm',
      }),
      {
        field: 'location_id',
        headerName: t('marketing.common.location'),
        hide: true,
        minWidth: 150,
        type: 'enum',
        options: locationOptions,
        valueGetter: (n) => locName(n.location_id),
      },
      {
        field: 'zone_name',
        headerName: t('marketing.common.zone'),
        hide: true,
        minWidth: 130,
        type: 'text',
        valueGetter: (n) => n.zone_name ?? '—',
      },
      {
        field: 'silent',
        headerName: t('marketing.notifications.silent'),
        hide: true,
        width: 100,
        type: 'boolean',
        valueGetter: (n) => (n.silent ? 'Yes' : 'No'),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 90,
        cellRenderer: renderActions,
      },
    ];
  }, [locName, locationOptions, onDelete]);

  return (
    <DuncitTable<NotificationRow>
      ariaLabel={t('shell.nav.notifications')}
      tableId="marketing-notifications"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getNotificationRowId}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.notifications.noNotificationsYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search title or body"
      refetchRef={refetchRef}
    />
  );
}
