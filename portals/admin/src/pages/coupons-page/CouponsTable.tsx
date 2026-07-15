import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { CouponRow } from './queries';

interface Props {
  tableId: string;
  fetchRows: TableFetch<CouponRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (c: CouponRow) => void;
  onDelete: (c: CouponRow) => void;
}

const SCOPE_OPTIONS = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'POD', label: 'Pod' },
];

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const getCouponRowId = (c: CouponRow) => c.id;

const renderCode = (c: CouponRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography fontWeight={800} variant="body2" component="span" display="block">
      {c.code}
    </Typography>
    {c.description && (
      <Typography variant="caption" color="text.secondary" component="span" display="block">
        {c.description}
      </Typography>
    )}
  </Box>
);

const scopeLabel = (c: CouponRow) => (c.scope === 'POD' ? c.pod?.pod_title || 'Pod' : 'Global');

const renderScope = (c: CouponRow) => (
  <Chip size="small" label={scopeLabel(c)} color={c.scope === 'POD' ? 'secondary' : 'default'} />
);

const validityValue = (c: CouponRow) => `${fmtDate(c.valid_from)} → ${fmtDate(c.valid_until)}`;

const usedValue = (c: CouponRow) => `${c.used_count}${c.max_uses ? ` / ${c.max_uses}` : ''}`;

const renderStatus = (c: CouponRow) => (
  <Chip size="small" color={c.is_active ? 'success' : 'default'} label={c.is_active ? 'Active' : 'Inactive'} />
);

/** Shared server-paged coupons table — used by /coupons (couponsTable) and the
 * pod details Offer codes section (couponsForPodTable). */
export default function CouponsTable({
  tableId,
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<CouponRow>[]>(() => {
    const renderActions = (c: CouponRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <IconButton size="small" onClick={() => onEdit(c)} aria-label="Edit coupon">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(c)} aria-label="Delete coupon">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
    return [
      { field: 'code', headerName: 'Code', flex: 1, minWidth: 180, cellRenderer: renderCode, valueGetter: (c) => c.code },
      {
        field: 'discount_pct',
        headerName: 'Discount',
        filter: { type: 'number' },
        width: 110,
        valueGetter: (c) => `${c.discount_pct}%`,
      },
      {
        field: 'scope',
        headerName: 'Scope',
        filter: { type: 'select', options: SCOPE_OPTIONS },
        minWidth: 140,
        cellRenderer: renderScope,
        valueGetter: scopeLabel,
      },
      {
        field: 'valid_from',
        headerName: 'Validity',
        filter: { type: 'date' },
        minWidth: 170,
        valueGetter: validityValue,
      },
      {
        field: 'valid_until',
        headerName: 'Valid until',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (c) => fmtDate(c.valid_until),
      },
      { field: 'used_count', headerName: 'Used', width: 100, valueGetter: usedValue },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (c) => (c.is_active ? 'Active' : 'Inactive'),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (c) => fmtDate(c.created_at),
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<CouponRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCouponRowId}
      toolbarActions={toolbarActions}
      emptyText="No coupons yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search code or description"
      refetchRef={refetchRef}
    />
  );
}
