import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatBytes } from '@duncit/media-picker';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { WebsiteReelRow } from './queries';

interface Props {
  fetchRows: TableFetch<WebsiteReelRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (reel: WebsiteReelRow) => void;
  onDelete: (reel: WebsiteReelRow) => void;
}

const getReelRowId = (reel: WebsiteReelRow) => reel.id;

export default function ReelsTable({ fetchRows, refetchRef, toolbarActions, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const columns = useMemo<DuncitColumn<WebsiteReelRow>[]>(() => {
    const titleOf = (reel: WebsiteReelRow) => reel.title || t('websiteApp.reels.untitled');
    const renderPreview = (reel: WebsiteReelRow) => (
      <Box
        component="video"
        src={reel.video_url}
        muted
        playsInline
        preload="metadata"
        aria-label={t('websiteApp.reels.preview', { vars: { title: titleOf(reel) } })}
        sx={{ width: 36, height: 56, borderRadius: 0.5, objectFit: 'cover', bgcolor: 'grey.900', display: 'block' }}
      />
    );
    const renderStatus = (reel: WebsiteReelRow) => (
      <Chip
        size="small"
        label={reel.is_active ? t('websiteApp.reels.visible') : t('websiteApp.reels.hidden')}
        color={reel.is_active ? 'success' : 'default'}
      />
    );
    const renderActions = (reel: WebsiteReelRow) => (
      <Stack direction="row" component="span" sx={{ justifyContent: 'flex-end' }}>
        <DuncitIconButton size="small" aria-label={t('shell.common.edit')} onClick={() => onEdit(reel)}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton size="small" color="error" aria-label={t('shell.common.delete')} onClick={() => onDelete(reel)}>
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    );
    return [
      { field: 'video_url', headerName: t('websiteApp.reels.colReel'), type: 'actions', width: 80, cellRenderer: renderPreview },
      { field: 'title', headerName: t('websiteApp.reels.colTitle'), type: 'text', flex: 1, minWidth: 160, valueGetter: titleOf },
      { field: 'description', headerName: t('shell.common.description'), type: 'text', flex: 1, minWidth: 200 },
      {
        field: 'file_size_bytes',
        headerName: t('websiteApp.reels.colSize'),
        type: 'number',
        width: 110,
        valueGetter: (reel) => formatBytes(reel.file_size_bytes),
      },
      { field: 'sort_order', headerName: t('shell.common.order'), type: 'number', width: 90 },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        type: 'boolean',
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: (reel) => (reel.is_active ? t('websiteApp.reels.visible') : t('websiteApp.reels.hidden')),
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        type: 'date',
        hide: true,
        width: 150,
        valueGetter: (reel) => (reel.created_at ? formatDate(reel.created_at) : ''),
      },
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 110, cellRenderer: renderActions },
    ];
  }, [t, formatDate, onEdit, onDelete]);

  return (
    <DuncitTable<WebsiteReelRow>
      tableId="website-reels"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getReelRowId}
      toolbarActions={toolbarActions}
      emptyText={t('websiteApp.reels.empty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}
