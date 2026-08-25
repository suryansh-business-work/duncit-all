import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import type { CouponRow } from './queries';
import { formatDate } from '@duncit/datetime';
import { useTranslation, type Translate } from './i18n';

interface Props {
  tableId: string;
  fetchRows: TableFetch<CouponRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (c: CouponRow) => void;
  onDelete: (c: CouponRow) => void;
}

const scopeOptions = (t: Translate) => [
  { value: 'GLOBAL', label: t('shell.coupons.filterGlobal') },
  { value: 'POD', label: t('shell.coupons.filterPod') },
];

const fmtDate = (iso?: string | null) => formatDate(iso) || '—';

const getCouponRowId = (c: CouponRow) => c.id;

const renderCode = (c: CouponRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography
      variant="body2"
      component="span"
      sx={{
        fontWeight: 800,
        display: "block"
      }}>
      {c.code}
    </Typography>
    {c.description && (
      <Typography
        variant="caption"
        component="span"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {c.description}
      </Typography>
    )}
  </Box>
);

/** A pod coupon shows the pod it belongs to; a global one says so. */
const scopeLabel = (c: CouponRow, t: Translate) => {
  if (c.scope !== 'POD') return t('shell.coupons.filterGlobal');
  return c.pod?.pod_title || t('shell.coupons.filterPod');
};

const renderScope = (c: CouponRow, t: Translate) => (
  <Chip size="small" label={scopeLabel(c, t)} color={c.scope === 'POD' ? 'secondary' : 'default'} />
);

const validityValue = (c: CouponRow) => `${fmtDate(c.valid_from)} → ${fmtDate(c.valid_until)}`;

const usedValue = (c: CouponRow) => {
  const cap = c.max_uses ? ` / ${c.max_uses}` : '';
  return `${c.used_count}${cap}`;
};

const localeDate = (d: Date) => formatDate(d);

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
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<CouponRow>[]>(() => {
    return [
      {
        field: 'code',
        headerName: t('shell.coupons.code'),
        flex: 1,
        minWidth: 180,
        cellRenderer: renderCode,
        valueGetter: (c) => c.code,
      },
      {
        field: 'discount_pct',
        headerName: t('shell.coupons.colDiscount'),
        filter: { type: 'number' },
        width: 110,
        valueGetter: (c) => `${c.discount_pct}%`,
      },
      {
        field: 'scope',
        headerName: t('shell.coupons.scope'),
        filter: { type: 'select', options: scopeOptions(t) },
        minWidth: 140,
        cellRenderer: (c) => renderScope(c, t),
        valueGetter: (c) => scopeLabel(c, t),
      },
      {
        field: 'valid_from',
        headerName: t('shell.coupons.colValidity'),
        filter: { type: 'date' },
        minWidth: 170,
        valueGetter: validityValue,
      },
      dateColumn<CouponRow>({
        field: 'valid_until',
        headerName: t('shell.coupons.validUntil'),
        formatDate: localeDate,
      }),
      { field: 'used_count', headerName: t('shell.coupons.colUsed'), width: 100, valueGetter: usedValue },
      activeChipColumn<CouponRow>(),
      dateColumn<CouponRow>({ formatDate: localeDate }),
      actionsColumn<CouponRow>({
        onEdit,
        onDelete,
        edit: { ariaLabel: t('shell.coupons.editAria') },
        delete: {
          ariaLabel: t('shell.coupons.deleteAria'),
          color: 'default',
          icon: <DeleteOutlineIcon fontSize="small" />,
        },
      }),
    ];
  }, [onEdit, onDelete, t]);

  return (
    <DuncitTable<CouponRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCouponRowId}
      toolbarActions={toolbarActions}
      emptyText={t('shell.coupons.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('shell.coupons.search')}
      refetchRef={refetchRef}
    />
  );
}
