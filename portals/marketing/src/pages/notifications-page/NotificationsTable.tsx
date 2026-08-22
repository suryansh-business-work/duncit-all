import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { scopes } from './helpers';
import type { NotificationRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

type LocName = (id?: string | null) => string;

interface Props {
  fetchRows: TableFetch<NotificationRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  locName: LocName;
  locationOptions: ReadonlyArray<{ value: string; label: string }>;
  toolbarActions?: ReactNode;
  onDelete: (n: NotificationRow) => void;
}

const getNotificationRowId = (n: NotificationRow) => n.id;

const scopeOptions = (t: Translate) => scopes(t).map((s) => ({ value: s.value, label: s.label }));

const scopeLabel = (n: NotificationRow, locName: LocName, t: Translate) => {
  if (n.scope === 'LOCATION') return t('marketing.notifications.scopeLocation', { vars: { name: locName(n.location_id) } });
  if (n.scope === 'ZONE') return t('marketing.notifications.scopeZone', { vars: { name: locName(n.location_id), zone: n.zone_name ?? '' } });
  if (n.scope === 'USER') return t('marketing.notifications.scopeUsers', { vars: { count: n.target_user_ids?.length ?? 0 } });
  return scopes(t).find((s) => s.value === n.scope)?.label ?? n.scope;
};

function ScopeChip({
  notification,
  locName,
}: Readonly<{ notification: NotificationRow; locName: LocName }>) {
  const { t } = useTranslation();
  const meta = scopes(t).find((s) => s.value === notification.scope);
  return (
    <Chip
      size="small"
      icon={meta?.icon}
      label={scopeLabel(notification, locName, t)}
      color={notification.scope === 'GLOBAL' ? 'primary' : 'default'}
      variant="outlined"
    />
  );
}

const renderTitle = (n: NotificationRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="div">
      {n.title}
    </Typography>
    {n.link_url && (
      <Typography
        variant="caption"
        color="text.secondary"
        component="div"
        sx={{ wordBreak: 'break-all' }}
      >
        → {n.link_url}
      </Typography>
    )}
  </Box>
);

const renderBody = (n: NotificationRow) => (
  <Typography variant="caption" sx={{ maxWidth: 280, display: 'inline-block' }}>
    {n.body}
  </Typography>
);

const renderDelivered = (n: NotificationRow) => (
  <Chip size="small" color="success" label={n.delivered_count} />
);

const renderFailed = (n: NotificationRow) => (
  <Chip size="small" color={n.failed_count ? 'warning' : 'default'} label={n.failed_count} />
);

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
        <IconButton size="small" onClick={() => onDelete(n)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
    return [
      {
        field: 'title',
        headerName: t('shell.common.title'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderTitle,
        valueGetter: (n) => n.title,
      },
      {
        field: 'body',
        headerName: t('marketing.notifications.body'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderBody,
        valueGetter: (n) => n.body,
      },
      {
        field: 'scope',
        headerName: t('marketing.common.audience'),
        minWidth: 180,
        filter: { type: 'select', options: scopeOptions(t) },
        cellRenderer: renderScope,
        valueGetter: (n) => scopeLabel(n, locName, t),
      },
      {
        field: 'delivered_count',
        headerName: t('marketing.notifications.delivered'),
        width: 110,
        filter: { type: 'number' },
        cellRenderer: renderDelivered,
        valueGetter: (n) => n.delivered_count,
      },
      {
        field: 'failed_count',
        headerName: t('marketing.common.failed'),
        width: 100,
        filter: { type: 'number' },
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
        filter: { type: 'select', options: locationOptions },
        valueGetter: (n) => locName(n.location_id),
      },
      {
        field: 'zone_name',
        headerName: t('marketing.common.zone'),
        hide: true,
        minWidth: 130,
        filter: { type: 'text' },
        valueGetter: (n) => n.zone_name ?? '—',
      },
      {
        field: 'silent',
        headerName: t('marketing.notifications.silent'),
        hide: true,
        width: 100,
        filter: { type: 'boolean' },
        valueGetter: (n) => (n.silent ? 'Yes' : 'No'),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        sortable: false,
        width: 90,
        cellRenderer: renderActions,
      },
    ];
  }, [locName, locationOptions, onDelete]);

  return (
    <DuncitTable<NotificationRow>
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
