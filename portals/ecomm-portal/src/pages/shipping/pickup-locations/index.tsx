import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { QueryGuard, SectionCard } from '@duncit/ui';
import ClientTable from '../../../components/ClientTable';
import { reload } from '../../../lib/actions';
import { STORE_PICKUP_LOCATIONS, type PickupLocations, type PickupRow, type Warehouse } from '../queries';
import WarehouseForm from './warehouse-form';
import { usePickupActions, type PickupActions } from './usePickupActions';
import { usePickupColumns } from './usePickupColumns';

const searchOf = (row: PickupRow) => `${row.warehouse.nickname} ${row.warehouse.city} ${row.warehouse.pincode}`;
const idOf = (row: PickupRow) => row.warehouse.id;

/** The warehouse dialog: closed, adding a new one, or correcting this one. */
type Editing = { warehouse: Warehouse | null } | null;

interface PickupBodyProps {
  result: PickupLocations;
  actions: PickupActions;
  onEdit: (row: PickupRow) => void;
}

function PickupBody({ result, actions, onEdit }: Readonly<PickupBodyProps>) {
  const { t } = useTranslation();
  const columns = usePickupColumns({ actions, onEdit });
  const ready = result.warehouses.filter((row) => row.shiprocket_state === 'READY').length;
  const awaiting = result.warehouses.some((row) => row.shiprocket_state === 'AWAITING_VERIFICATION');
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ecommPortal.shipping.pickupsIntro')}
      </Typography>
      {result.shiprocket_error ? (
        <Alert severity="warning">{t('ecommPortal.shipping.pickupsUnread', { vars: { reason: result.shiprocket_error } })}</Alert>
      ) : null}
      {awaiting ? <Alert severity="info">{t('ecommPortal.shipping.verifyHint')}</Alert> : null}
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t('ecommPortal.shipping.readyCount', { vars: { ready, total: result.warehouses.length } })}
      </Typography>
      <ClientTable<PickupRow>
        tableId="ecomm-pickup-locations"
        rows={result.warehouses}
        columns={columns}
        searchOf={searchOf}
        getRowId={idOf}
        ariaLabel={t('ecommPortal.shipping.pickups')}
        emptyText={t('ecommPortal.shipping.noWarehouses')}
        searchPlaceholder={t('ecommPortal.shipping.searchPickups')}
      />
    </Stack>
  );
}

/**
 * The ShipRocket account's pickup addresses. Opening the page reads the
 * account and takes in every address it has, so this list IS its list —
 * matched by nickname, the name every order's `pickup_location` must equal
 * exactly. Adding one here creates it on the account first, and an address
 * the account already holds is changed and removed there.
 */
export default function PickupLocationsCard() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(STORE_PICKUP_LOCATIONS, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const actions = usePickupActions();
  const [editing, setEditing] = useState<Editing>(null);
  const onEdit = useCallback((row: PickupRow) => setEditing({ warehouse: row.warehouse }), []);
  const result = data?.storePickupLocations;
  return (
    <SectionCard
      title={t('ecommPortal.shipping.pickups')}
      action={
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} disabled={actions.busy} onClick={() => setEditing({ warehouse: null })}>
            {t('ecommPortal.shipping.addWarehouse')}
          </DuncitButton>
          <DuncitButton size="small" startIcon={<SyncIcon />} loading={loading} onClick={() => reload(refetch)}>
            {t('ecommPortal.shipping.syncPickups')}
          </DuncitButton>
        </Stack>
      }
    >
      <QueryGuard loading={loading && !result} error={error}>
        {() => result && <PickupBody result={result} actions={actions} onEdit={onEdit} />}
      </QueryGuard>
      {editing ? (
        <WarehouseForm warehouse={editing.warehouse} busy={actions.busy} onClose={() => setEditing(null)} onSubmit={actions.save} />
      ) : null}
    </SectionCard>
  );
}
