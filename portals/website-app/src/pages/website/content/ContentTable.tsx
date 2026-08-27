import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import type { WebsiteContentItem } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  tableId: string;
  fetchRows: TableFetch<WebsiteContentItem>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (item: WebsiteContentItem) => void;
  onDelete: (item: WebsiteContentItem) => void;
}

const getContentRowId = (item: WebsiteContentItem) => item.id;

const renderEntry = (item: WebsiteContentItem) => (
  <Stack direction="row" spacing={1.5} sx={{
    alignItems: "center"
  }}>
    <Avatar src={item.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
      <ImageIcon fontSize="small" />
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="div" sx={{
        fontWeight: 600
      }}>
        {item.title}
      </Typography>
      <Typography variant="caption" noWrap component="div" sx={{
        color: "text.secondary"
      }}>
        /{item.slug}
      </Typography>
    </Box>
  </Stack>
);

const renderStatus = (item: WebsiteContentItem) => (
  <Chip
    size="small"
    label={item.is_published ? 'Published' : 'Draft'}
    color={item.is_published ? 'success' : 'default'}
  />
);

export default function ContentTable({
  tableId,
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const columns = useMemo<DuncitColumn<WebsiteContentItem>[]>(() => {
    const renderActions = (item: WebsiteContentItem) => (
      <Stack direction="row" component="span" sx={{
        justifyContent: "flex-end"
      }}>
        <DuncitIconButton size="small" onClick={() => onEdit(item)} aria-label={t('shell.common.edit')}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton size="small" color="error" onClick={() => onDelete(item)} aria-label={t('shell.common.delete')}>
          <DeleteIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    );
    return [
      {
        field: 'title',
        headerName: t('websiteApp.content.colEntry'),
        flex: 1,
        minWidth: 240,
        cellRenderer: renderEntry,
        valueGetter: (item) => item.title,
      },
      {
        field: 'category',
        headerName: t('websiteApp.content.colCategory'),
        filter: { type: 'text' },
        minWidth: 130,
        valueGetter: (item) => item.category || '—',
      },
      {
        field: 'is_published',
        headerName: t('shell.common.status'),
        filter: { type: 'boolean' },
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: (item) => (item.is_published ? 'Published' : 'Draft'),
      },
      {
        field: 'published_at',
        headerName: t('websiteApp.content.colPublished'),
        filter: { type: 'date' },
        width: 150,
        valueGetter: (item) => (item.published_at ? formatDate(item.published_at) : '—'),
      },
      { field: 'sort_order', headerName: t('shell.common.order'), hide: true, width: 90 },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        filter: { type: 'date' },
        hide: true,
        width: 150,
        valueGetter: (item) => (item.created_at ? formatDate(item.created_at) : '—'),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        sortable: false,
        width: 110,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDate, onEdit, onDelete]);

  return (
    <DuncitTable<WebsiteContentItem>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getContentRowId}
      toolbarActions={toolbarActions}
      emptyText={t('websiteApp.content.empty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search title, slug or category"
      refetchRef={refetchRef}
    />
  );
}
