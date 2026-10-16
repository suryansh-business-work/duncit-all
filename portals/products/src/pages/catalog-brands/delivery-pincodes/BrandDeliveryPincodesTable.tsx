import { useMemo, type RefObject } from 'react';
import { Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { BrandDeliveryPincodeRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const STATUS_COLOR = { SERVICEABLE: 'success', NOT_SERVICEABLE: 'error', UNCHECKED: 'default' } as const;

const statusOf = (row: BrandDeliveryPincodeRow) => {
  if (row.serviceable === true) return 'SERVICEABLE';
  if (row.serviceable === false) return 'NOT_SERVICEABLE';
  return 'UNCHECKED';
};

const statusLabel = (row: BrandDeliveryPincodeRow, t: Translate) => {
  if (row.serviceable === true) return t('products.deliveryPincodes.serviceable');
  if (row.serviceable === false) return t('products.deliveryPincodes.notServiceable');
  return t('products.deliveryPincodes.unchecked');
};

interface Props {
  fetchRows: TableFetch<BrandDeliveryPincodeRow>;
  refetchRef: RefObject<(() => void) | null>;
  onRemove: (row: BrandDeliveryPincodeRow) => void;
}

/** A brand's delivery pincodes with their last ShipRocket check. */
export default function BrandDeliveryPincodesTable({ fetchRows, refetchRef, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const columns = useMemo<DuncitColumn<BrandDeliveryPincodeRow>[]>(
    () => [
      { field: 'pincode', headerName: t('products.deliveryPincodes.colPincode'), type: 'text', width: 130 },
      {
        field: 'serviceable',
        headerName: t('products.deliveryPincodes.colShiprocket'),
        type: 'boolean',
        width: 170,
        cellRenderer: (row) => (
          <Tooltip describeChild title={row.sync_error}>
            <span>
              <StatusChip status={statusOf(row)} label={statusLabel(row, t)} colorMap={STATUS_COLOR} />
            </span>
          </Tooltip>
        ),
        valueGetter: (row) => statusLabel(row, t),
      },
      {
        field: 'courier_name',
        headerName: t('products.deliveryPincodes.colCourier'),
        type: 'text',
        flex: 1,
        minWidth: 160,
        sortable: false,
        valueGetter: (row) => [row.courier_name, row.etd].filter(Boolean).join(' · ') || '—',
      },
      {
        field: 'checked_at',
        headerName: t('products.deliveryPincodes.colChecked'),
        type: 'date',
        width: 140,
        valueGetter: (row) => (row.checked_at ? formatDate(row.checked_at) : '—'),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 90,
        cellRenderer: (row) => (
          <Tooltip title={t('shell.common.delete')}>
            <DuncitIconButton
              size="small"
              aria-label={`${t('shell.common.delete')} ${row.pincode}`}
              onClick={() => onRemove(row)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        ),
      },
    ],
    [t, formatDate, onRemove],
  );

  return (
    <DuncitTable<BrandDeliveryPincodeRow>
      tableId="products-brand-delivery-pincodes"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={(row) => row.id}
      emptyText={t('products.deliveryPincodes.empty')}
      defaultSort={{ field: 'pincode', dir: 'asc' }}
      searchPlaceholder={t('products.deliveryPincodes.search')}
      refetchRef={refetchRef}
    />
  );
}
