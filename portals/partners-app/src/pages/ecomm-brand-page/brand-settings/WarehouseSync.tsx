import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { SYNC_MY_WAREHOUSES, type WarehouseSyncResult } from './warehouse.queries';

interface Props {
  brandId: string;
  /** Called after a sync so the list re-reads — a sync can take in new warehouses. */
  onSynced: () => void;
}

const WAREHOUSES_LOGGER = logs.portal['partners-app'];

/**
 * "Sync with ShipRocket": checks the brand's warehouses against the ShipRocket
 * account it ships on and, on the brand's own account, takes in the pickup
 * addresses it already has there. When ShipRocket cannot be read the
 * warehouses still list — the reason is shown above them.
 */
export default function WarehouseSync({ brandId, onSynced }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sync, { loading }] = useMutation<{ syncMyBrandPickupLocations: WarehouseSyncResult }>(SYNC_MY_WAREHOUSES);
  const [result, setResult] = useState<WarehouseSyncResult | null>(null);

  const run = async () => {
    try {
      const { data } = await sync({ variables: { brand_doc_id: brandId } });
      const synced = data?.syncMyBrandPickupLocations ?? null;
      setResult(synced);
      if (synced?.shiprocket_error) notifyError(t('partners.warehouses.syncFailed'));
      else notifySuccess(t('partners.warehouses.synced', { vars: { adopted: synced?.adopted ?? 0 } }));
      onSynced();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitButton
          variant="outlined"
          startIcon={<SyncIcon />}
          loading={loading}
          onClick={() => fireAndForget(run(), WAREHOUSES_LOGGER, 'WarehouseSync', 'sync')}
          data-testid="warehouse-sync"
        >
          {t('partners.warehouses.sync')}
        </DuncitButton>
        {result?.synced_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('partners.warehouses.syncedAt', { vars: { at: formatDateTime(result.synced_at) } })}
          </Typography>
        )}
      </Stack>
      {result?.shiprocket_error && (
        <Alert severity="warning" data-testid="warehouse-sync-error">
          {t('partners.warehouses.shiprocketUnreadable', { vars: { error: result.shiprocket_error } })}
        </Alert>
      )}
    </Stack>
  );
}
