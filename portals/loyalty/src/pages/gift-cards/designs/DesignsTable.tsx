import { useMemo } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import type { GiftCardDesignRow } from './queries';

interface Props {
  fetchRows: TableFetch<GiftCardDesignRow>;
  onRowClick: (row: GiftCardDesignRow) => void;
}

const getRowId = (row: GiftCardDesignRow) => row.id;

function StatusChips({ row, t }: Readonly<{ row: GiftCardDesignRow; t: Translator['t'] }>) {
  return (
    <Stack direction="row" spacing={0.5}>
      {row.is_default && <Chip size="small" color="primary" label={t('loyalty.designs.default')} sx={{ fontWeight: 800 }} />}
      <Chip
        size="small"
        variant="outlined"
        color={row.is_active ? 'success' : 'default'}
        label={row.is_active ? t('loyalty.designs.active') : t('loyalty.designs.inactive')}
      />
    </Stack>
  );
}

const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<GiftCardDesignRow>[] => [
  {
    field: 'front_image_url',
    headerName: t('loyalty.designs.colPreview'),
    minWidth: 120,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (row) => (
      <Box component="img" src={row.front_image_url} alt={row.name} sx={{ width: 80, aspectRatio: '1.6 / 1', objectFit: 'cover', borderRadius: 1 }} />
    ),
  },
  { field: 'name', headerName: t('loyalty.designs.colName'), flex: 1, minWidth: 180, type: 'text', valueGetter: (row) => row.name },
  { field: 'category', headerName: t('loyalty.designs.colCategory'), minWidth: 140, type: 'text', valueGetter: (row) => row.category || '—' },
  {
    field: 'is_default',
    headerName: t('loyalty.designs.colStatus'),
    minWidth: 170,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (row) => <StatusChips row={row} t={t} />,
  },
  { field: 'physical_stock', headerName: t('loyalty.designs.colStock'), minWidth: 120, type: 'number', valueGetter: (row) => row.physical_stock },
  { field: 'sort_order', headerName: t('loyalty.designs.colSortOrder'), minWidth: 100, type: 'number', valueGetter: (row) => row.sort_order },
  dateColumn<GiftCardDesignRow>({ field: 'updated_at', headerName: t('loyalty.designs.colUpdated'), minWidth: 170, hide: false, formatDate: formatDateTime }),
];

/** Every design in the catalogue — the default first; a row opens the design. */
export default function DesignsTable({ fetchRows, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable
      tableId="loyalty-gift-card-designs"
      columns={columns}
      fetchRows={fetchRows}
      onRowClick={onRowClick}
      getRowId={getRowId}
      emptyText={t('loyalty.designs.empty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      defaultPageSize={10}
      searchPlaceholder={t('loyalty.designs.search')}
    />
  );
}
