import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
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

const localeDate = (d: Date) =>
  d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });

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
      dateColumn<CouponRow>({ field: 'valid_until', headerName: 'Valid until', formatDate: localeDate }),
      { field: 'used_count', headerName: 'Used', width: 100, valueGetter: usedValue },
      activeChipColumn<CouponRow>(),
      dateColumn<CouponRow>({ formatDate: localeDate }),
      actionsColumn<CouponRow>({
        onEdit,
        onDelete,
        edit: { ariaLabel: 'Edit coupon' },
        delete: { ariaLabel: 'Delete coupon', color: 'default', icon: <DeleteOutlineIcon fontSize="small" /> },
      }),
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
