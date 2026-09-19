import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { actionsColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { PickupRow, PickupState } from '../queries';
import type { PickupActions } from './usePickupActions';

const STATE_COLORS: StatusColorMap = {
  READY: 'success',
  AWAITING_VERIFICATION: 'warning',
  NOT_IN_SHIPROCKET: 'error',
  UNKNOWN: 'default',
};
const STATE_KEYS: Record<PickupState, string> = {
  READY: 'ecommPortal.shipping.pickupReady',
  AWAITING_VERIFICATION: 'ecommPortal.shipping.pickupAwaiting',
  NOT_IN_SHIPROCKET: 'ecommPortal.shipping.pickupMissing',
  UNKNOWN: 'ecommPortal.shipping.pickupUnknown',
};

const isOwn = (row: PickupRow) => row.warehouse.owner_kind === 'DUNCIT';
/** Only a warehouse ShipRocket does not hold is corrected here; one it holds is changed there. */
const editable = (row: PickupRow) => isOwn(row) && !row.warehouse.shiprocket_registered;
const pushable = (row: PickupRow) => row.shiprocket_state === 'NOT_IN_SHIPROCKET' && row.warehouse.review_status === 'APPROVED';

const renderReason = (row: PickupRow) => (
  <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
    {row.warehouse.shiprocket_error || EM_DASH}
  </Typography>
);

interface PickupColumnActions {
  actions: PickupActions;
  onEdit: (row: PickupRow) => void;
}

/** The pickup-address table: our warehouse, where it is, and what ShipRocket says about it. */
export function usePickupColumns({ actions, onEdit }: PickupColumnActions): DuncitColumn<PickupRow>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<PickupRow>[]>(() => {
    const ownerLabel = (row: PickupRow) => (isOwn(row) ? t('ecommPortal.shipping.storeWarehouse') : t('ecommPortal.shipping.partnerWarehouse'));
    const renderName = (row: PickupRow) => (
      <Stack sx={{ py: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {row.warehouse.nickname}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {row.warehouse.is_default ? t('ecommPortal.shipping.defaultOwner', { vars: { owner: ownerLabel(row) } }) : ownerLabel(row)}
        </Typography>
      </Stack>
    );
    const renderState = (row: PickupRow) => (
      <StatusChip status={row.shiprocket_state} label={t(STATE_KEYS[row.shiprocket_state])} colorMap={STATE_COLORS} />
    );
    const renderPush = (row: PickupRow) =>
      pushable(row) ? (
        <DuncitButton size="small" startIcon={<CloudUploadIcon />} disabled={actions.busy} onClick={() => actions.register(row.warehouse)}>
          {t('ecommPortal.shipping.addToShiprocket')}
        </DuncitButton>
      ) : null;
    return [
      { field: 'warehouse.nickname', headerName: t('ecommPortal.shipping.nickname'), type: 'text', minWidth: 190, flex: 1, cellRenderer: renderName },
      { field: 'warehouse.city', headerName: t('ecommPortal.shipping.city'), type: 'text', width: 140 },
      { field: 'warehouse.pincode', headerName: t('ecommPortal.shipping.pincode'), type: 'text', width: 110 },
      { field: 'product_count', headerName: t('ecommPortal.shipping.products'), type: 'number', width: 110 },
      {
        field: 'shiprocket_state',
        headerName: t('shell.common.status'),
        type: 'text',
        width: 220,
        cellRenderer: renderState,
        valueGetter: (row) => t(STATE_KEYS[row.shiprocket_state]),
      },
      { field: 'warehouse.shiprocket_error', headerName: t('ecommPortal.shipping.shiprocketNote'), type: 'text', minWidth: 240, flex: 1, sortable: false, cellRenderer: renderReason },
      actionsColumn<PickupRow>({
        width: 280,
        renderExtra: renderPush,
        onEdit,
        onDelete: (row) => actions.remove(row.warehouse),
        edit: {
          ariaLabel: (row) => t('shell.a11y.editNamed', { vars: { name: row.warehouse.nickname } }),
          disabled: (row) => actions.busy || !editable(row),
          disabledTitle: (row) => (isOwn(row) ? t('ecommPortal.shipping.editInShiprocket') : t('ecommPortal.shipping.partnerLocked')),
        },
        delete: {
          ariaLabel: (row) => t('shell.a11y.deleteNamed', { vars: { name: row.warehouse.nickname } }),
          disabled: (row) => actions.busy || !isOwn(row) || row.product_count > 0,
          disabledTitle: (row) => (isOwn(row) ? t('ecommPortal.shipping.warehouseInUse') : t('ecommPortal.shipping.partnerLocked')),
        },
      }),
    ];
  }, [t, actions, onEdit]);
}
