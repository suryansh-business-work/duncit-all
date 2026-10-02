import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Stack, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { AppPopupRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';
import {
  getRowId,
  platformLabels,
  renderName,
  renderPlatform,
  renderStatus,
  selectAudiences,
  selectPlatforms,
  statusOf,
} from './cells';

interface Props {
  fetchRows: TableFetch<AppPopupRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  listName: (id?: string | null) => string;
  toolbarActions?: ReactNode;
  onEdit: (popup: AppPopupRow) => void;
  onDelete: (popup: AppPopupRow) => void;
}

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
          <DuncitIconButton size="small" onClick={() => onEdit(popup)}>
            <EditIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('shell.common.delete')}>
          <DuncitIconButton size="small" onClick={() => onDelete(popup)}>
            <DeleteIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    );

    return [
      {
        field: 'name',
        headerName: t('marketing.appPopups.popup'),
        type: 'text',
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
        type: 'boolean',
        cellRenderer: renderStatus,
        valueGetter: statusOf,
      },
      {
        field: 'platform',
        headerName: t('marketing.appPopups.platform'),
        minWidth: 160,
        type: 'enum',
        options: selectPlatforms(t),
        cellRenderer: (popup: AppPopupRow) => renderPlatform(popup, t),
        valueGetter: (popup) => platformLabels(t).get(popup.platform),
      },
      {
        field: 'audience_type',
        headerName: t('marketing.common.audience'),
        minWidth: 180,
        type: 'enum',
        options: selectAudiences(t),
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
        type: 'boolean',
        valueGetter: (popup) => (popup.close_button_enabled ? 'Yes' : 'No'),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 110,
        cellRenderer: renderActions,
      },
    ];
  }, [listName, onDelete, onEdit]);

  return (
    <DuncitTable<AppPopupRow>
      ariaLabel={t('shell.nav.appPopups')}
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
