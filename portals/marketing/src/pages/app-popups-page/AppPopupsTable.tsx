import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { audienceOptions, platformOptions } from './app-popup-form';
import type { AppPopupRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  fetchRows: TableFetch<AppPopupRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  listName: (id?: string | null) => string;
  toolbarActions?: ReactNode;
  onEdit: (popup: AppPopupRow) => void;
  onDelete: (popup: AppPopupRow) => void;
}

const getRowId = (popup: AppPopupRow) => popup.id;

const platformLabels = (t: Translate) =>
  new Map(platformOptions(t).map((o) => [o.value as string, o.label]));
const selectPlatforms = (t: Translate) =>
  platformOptions(t).map((o) => ({ value: o.value, label: o.label }));
const selectAudiences = (t: Translate) =>
  audienceOptions(t).map((o) => ({ value: o.value, label: o.label }));

/**
 * Live means enabled AND inside its window right now — the same two conditions
 * the app-open read applies, so what this column says is what a phone gets.
 */
const isLive = (popup: AppPopupRow) => {
  const now = Date.now();
  return (
    popup.enabled &&
    new Date(popup.start_at).getTime() <= now &&
    new Date(popup.end_at).getTime() >= now
  );
};

const statusOf = (popup: AppPopupRow) => {
  if (!popup.enabled) return 'Disabled';
  if (isLive(popup)) return 'Live';
  if (new Date(popup.start_at).getTime() > Date.now()) return 'Scheduled';
  return 'Ended';
};

const STATUS_COLORS: Record<string, 'success' | 'info' | 'default'> = {
  Live: 'success',
  Scheduled: 'info',
};

const renderName = (popup: AppPopupRow) => (
  <Stack direction="row" spacing={1} sx={{
    alignItems: "center"
  }}>
    <Avatar src={popup.image_url} variant="rounded" sx={{ width: 40, height: 40 }} />
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 600
      }}>
        {popup.name}
      </Typography>
      {popup.cta_url && (
        <Typography
          variant="caption"
          component="div"
          sx={{
            color: "text.secondary",
            wordBreak: 'break-all'
          }}>
          → {popup.cta_label}: {popup.cta_url}
        </Typography>
      )}
    </Box>
  </Stack>
);

const renderStatus = (popup: AppPopupRow) => {
  const status = statusOf(popup);
  return <Chip size="small" label={status} color={STATUS_COLORS[status] ?? 'default'} />;
};

const renderPlatform = (popup: AppPopupRow, t: Translate) => (
  <Chip
    size="small"
    variant="outlined"
    label={platformLabels(t).get(popup.platform) ?? popup.platform}
  />
);

export default function AppPopupsTable({
  fetchRows,
  refetchRef,
  listName,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<AppPopupRow>[]>(() => {
    const audienceLabel = (popup: AppPopupRow) =>
      popup.audience_type === 'ALL_USERS' ? 'All users' : listName(popup.audience_list_id);

    const renderActions = (popup: AppPopupRow) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={t('shell.common.edit')}>
          <IconButton size="small" onClick={() => onEdit(popup)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('shell.common.delete')}>
          <IconButton size="small" onClick={() => onDelete(popup)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );

    return [
      {
        field: 'name',
        headerName: t('marketing.appPopups.popup'),
        flex: 1,
        minWidth: 240,
        cellRenderer: renderName,
        valueGetter: (popup) => popup.name,
      },
      {
        field: 'enabled',
        headerName: t('shell.common.status'),
        width: 130,
        // A boolean column filters is_true/is_false — a select of 'true'/'false'
        // is dropped by the shared engine and would filter nothing at all.
        filter: { type: 'boolean' },
        cellRenderer: renderStatus,
        valueGetter: statusOf,
      },
      {
        field: 'platform',
        headerName: t('marketing.appPopups.platform'),
        minWidth: 160,
        filter: { type: 'select', options: selectPlatforms(t) },
        cellRenderer: (popup: AppPopupRow) => renderPlatform(popup, t),
        valueGetter: (popup) => platformLabels(t).get(popup.platform) ?? popup.platform,
      },
      {
        field: 'audience_type',
        headerName: t('marketing.common.audience'),
        minWidth: 180,
        filter: { type: 'select', options: selectAudiences(t) },
        valueGetter: audienceLabel,
      },
      dateColumn<AppPopupRow>({
        field: 'start_at',
        headerName: t('marketing.common.starts'),
        hide: false,
        width: 160,
        format: 'd MMM yyyy, HH:mm',
      }),
      dateColumn<AppPopupRow>({
        field: 'end_at',
        headerName: t('marketing.common.ends'),
        hide: false,
        width: 160,
        format: 'd MMM yyyy, HH:mm',
      }),
      {
        field: 'close_button_enabled',
        headerName: t('marketing.appPopups.close'),
        hide: true,
        width: 110,
        filter: { type: 'boolean' },
        valueGetter: (popup) => (popup.close_button_enabled ? 'Yes' : 'No'),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        sortable: false,
        width: 110,
        cellRenderer: renderActions,
      },
    ];
  }, [listName, onDelete, onEdit]);

  return (
    <DuncitTable<AppPopupRow>
      tableId="marketing-app-popups"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.appPopups.noAppPopupsYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search popup name"
      refetchRef={refetchRef}
    />
  );
}
