import { useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { SectionCard, StatusChip, type StatusColorMap } from '@duncit/ui';
import ClientTable from '../../components/ClientTable';
import { runAction } from '../../lib/actions';
import { SYNC_PICKUP_LOCATIONS, type PickupSyncRow } from './queries';

const STATE_COLORS: StatusColorMap = { READY: 'success', AWAITING_VERIFICATION: 'warning', NOT_IN_SHIPROCKET: 'error' };
const STATE_KEYS: Record<string, string> = {
  READY: 'ecommPortal.shipping.pickupReady',
  AWAITING_VERIFICATION: 'ecommPortal.shipping.pickupAwaiting',
  NOT_IN_SHIPROCKET: 'ecommPortal.shipping.pickupMissing',
};

const searchOf = (row: PickupSyncRow) => `${row.nickname} ${row.city} ${row.pincode}`;
const idOf = (row: PickupSyncRow) => row.warehouse_id;

/**
 * Our warehouses against the ShipRocket account's pickup addresses, matched by
 * nickname — the name every order's `pickup_location` must equal exactly.
 */
export default function PickupSyncCard() {
  const { t } = useTranslation();
  const [sync, { data, loading }] = useMutation(SYNC_PICKUP_LOCATIONS);
  const result = data?.storeSyncPickupLocations;
  const columns = useMemo<DuncitColumn<PickupSyncRow>[]>(() => {
    const renderState = (row: PickupSyncRow) => (
      <StatusChip status={row.state} label={t(STATE_KEYS[row.state])} colorMap={STATE_COLORS} />
    );
    return [
      { field: 'nickname', headerName: t('ecommPortal.shipping.nickname'), type: 'text', minWidth: 180, flex: 1 },
      { field: 'city', headerName: t('ecommPortal.shipping.city'), type: 'text', width: 150 },
      { field: 'pincode', headerName: t('ecommPortal.shipping.pincode'), type: 'text', width: 110 },
      { field: 'state', headerName: t('shell.common.status'), type: 'text', width: 200, cellRenderer: renderState, valueGetter: (row) => t(STATE_KEYS[row.state]) },
    ];
  }, [t]);
  const unmatched = result?.shiprocket_only ?? [];
  return (
    <SectionCard
      title={t('ecommPortal.shipping.pickups')}
      action={
        <DuncitButton size="small" startIcon={<SyncIcon />} disabled={loading} onClick={() => runAction(() => sync(), t('ecommPortal.shipping.pickupsSynced'))}>
          {t('ecommPortal.shipping.syncPickups')}
        </DuncitButton>
      }
    >
      {result ? (
        <Stack spacing={2}>
          <ClientTable<PickupSyncRow>
            tableId="ecomm-pickup-sync"
            rows={result.warehouses}
            columns={columns}
            searchOf={searchOf}
            getRowId={idOf}
            ariaLabel={t('ecommPortal.shipping.pickups')}
            emptyText={t('ecommPortal.shipping.noWarehouses')}
            searchPlaceholder={t('ecommPortal.shipping.searchPickups')}
          />
          {unmatched.length > 0 ? (
            <Alert severity="info">
              {t('ecommPortal.shipping.unmatchedPickups', { vars: { names: unmatched.map((p) => p.nickname).join(', ') } })}
            </Alert>
          ) : null}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.shipping.pickupsIntro')}
        </Typography>
      )}
    </SectionCard>
  );
}
