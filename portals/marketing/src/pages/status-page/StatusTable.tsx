import { useMemo, type ReactNode, type RefObject } from 'react';
import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  EM_DASH,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { ambientDateFormatter, formatDateTime, useTranslation } from '@duncit/app-settings';
import { scopeOptions } from './status-form';
import type { OfficialStatusRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  fetchRows: TableFetch<OfficialStatusRow>;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (status: OfficialStatusRow) => void;
  onDelete: (status: OfficialStatusRow) => void;
}

const getRowId = (status: OfficialStatusRow) => status.id;

/** A video has no still to show, so the tile says what it is instead. */
function StatusThumb({ status }: Readonly<{ status: OfficialStatusRow }>) {
  if (status.media_type === 'VIDEO') {
    return (
      <Avatar variant="rounded" sx={{ width: 36, height: 48, bgcolor: 'action.hover' }}>
        <PlayCircleIcon fontSize="small" color="primary" />
      </Avatar>
    );
  }
  return (
    <Avatar alt="" src={status.media_url} variant="rounded" sx={{ width: 36, height: 48 }} />
  );
}

function renderStatus(status: OfficialStatusRow) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <StatusThumb status={status} />
      <Box sx={{ lineHeight: 1.2, minWidth: 0 }}>
        <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
          {status.title}
        </Typography>
        {status.caption && (
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
            {status.caption}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

const scopeText = (status: OfficialStatusRow, t: Translate) => {
  if (status.scope === 'GLOBAL') return t('marketing.status.global');
  return status.location_names.join(', ') || EM_DASH;
};

/** Never / the date / Expired — read against the admin-configured clock. */
const expiryText = (status: OfficialStatusRow, t: Translate) => {
  if (!status.expires_at) return t('marketing.status.never');
  const due = new Date(status.expires_at).getTime();
  if (due <= ambientDateFormatter().now().getTime()) return t('marketing.status.expired');
  return formatDateTime(status.expires_at);
};

const liveText = (status: OfficialStatusRow, t: Translate) => {
  if (status.is_live) return t('marketing.status.live');
  if (!status.is_active) return t('marketing.status.off');
  return t('marketing.status.expired');
};

const renderLive = (status: OfficialStatusRow, t: Translate) => (
  <Chip
    size="small"
    label={liveText(status, t)}
    color={status.is_live ? 'success' : 'default'}
  />
);

/** Marketing > Status: every Duncit status, live or not. */
export default function StatusTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<OfficialStatusRow>[]>(
    () => [
      {
        field: 'title',
        headerName: t('shell.common.status'),
        type: 'text',
        flex: 1,
        minWidth: 260,
        cellRenderer: renderStatus,
        valueGetter: (status) => status.title,
      },
      {
        field: 'scope',
        headerName: t('marketing.status.scope'),
        type: 'enum',
        minWidth: 180,
        // Filterable, never sortable: the server's table config allowlists a
        // scope filter but only title/created_at/expires_at sorts, and an
        // unknown sort is dropped silently rather than refused.
        sortable: false,
        options: scopeOptions(t).map((option) => ({ value: option.value, label: option.label })),
        valueGetter: (status) => scopeText(status, t),
      },
      {
        field: 'expires_at',
        headerName: t('marketing.status.expiry'),
        type: 'date',
        width: 190,
        valueGetter: (status) => expiryText(status, t),
      },
      {
        field: 'is_active',
        headerName: t('marketing.status.live'),
        type: 'boolean',
        width: 110,
        sortable: false,
        cellRenderer: (status: OfficialStatusRow) => renderLive(status, t),
        valueGetter: (status) => liveText(status, t),
      },
      {
        field: 'view_count',
        headerName: t('marketing.status.views'),
        type: 'number',
        width: 100,
        // Counted from the seen collection rather than stored on the row, so
        // the server can neither sort nor filter on it.
        sortable: false,
        filterable: false,
        valueGetter: (status) => status.view_count,
      },
      {
        field: 'created_by',
        headerName: t('marketing.status.publishedBy'),
        type: 'text',
        width: 160,
        hide: true,
        // Resolved from the publisher's profile name, so there is nothing
        // stored on the row for the server to sort or filter on.
        sortable: false,
        filterable: false,
        valueGetter: (status) => status.created_by || EM_DASH,
      },
      dateColumn<OfficialStatusRow>({ field: 'created_at', hide: false, width: 140 }),
      actionsColumn<OfficialStatusRow>({ onEdit, onDelete }),
    ],
    [onDelete, onEdit, t],
  );

  return (
    <DuncitTable<OfficialStatusRow>
      ariaLabel={t('shell.nav.status')}
      tableId="marketing-official-statuses"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.status.noStatusesYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('marketing.status.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
