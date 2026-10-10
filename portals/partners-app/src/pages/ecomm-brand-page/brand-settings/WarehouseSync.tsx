import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { SYNC_MY_WAREHOUSES, type WarehouseSyncResult } from './warehouse.queries';

interface Props {
  brandId: string;
  /** Called after a sync so the list re-reads — a sync can register warehouses and take in new ones. */
  onSynced: () => void;
}

const WAREHOUSES_LOGGER = logs.portal['partners-app'];

/**
 * Keeps the brand's warehouses in step with ShipRocket, with nothing to press:
 * every time the page opens for a brand, its approved warehouses are sent to
 * the ShipRocket account it ships on (if they are not there yet) and, on the
 * brand's own account, the pickup addresses it already has there are taken in.
 * When ShipRocket cannot be read the warehouses still list — the reason is
 * shown above them, and each warehouse carries its own.
 */
export default function WarehouseSync({ brandId, onSynced }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sync, { loading }] = useMutation<{ syncMyBrandPickupLocations: WarehouseSyncResult }>(SYNC_MY_WAREHOUSES);
  const [result, setResult] = useState<WarehouseSyncResult | null>(null);
  const [failure, setFailure] = useState('');
  // The page hands a new callback on every render; the sync must run once per brand, not once per render.
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  useEffect(() => {
    let current = true;
    const run = async () => {
      try {
        const { data } = await sync({ variables: { brand_doc_id: brandId } });
        if (!current) return;
        setFailure('');
        setResult(data?.syncMyBrandPickupLocations ?? null);
        onSyncedRef.current();
      } catch (error) {
        if (current) setFailure(parseApiError(error));
      }
    };
    fireAndForget(run(), WAREHOUSES_LOGGER, 'WarehouseSync', 'sync');
    return () => {
      current = false;
    };
  }, [brandId, sync]);

  const unreadable = failure || result?.shiprocket_error || '';

  return (
    <Stack spacing={1} data-testid="warehouse-sync">
      {loading && (
        <Stack direction="row" spacing={1} role="status" sx={{ alignItems: 'center' }}>
          <CircularProgress size={16} aria-hidden />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('partners.warehouses.syncing')}
          </Typography>
        </Stack>
      )}
      {!loading && result?.synced_at && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="warehouse-synced-at">
          {t('partners.warehouses.syncedAt', { vars: { at: formatDateTime(result.synced_at) } })}
        </Typography>
      )}
      {!loading && unreadable && (
        <Alert severity="warning" data-testid="warehouse-sync-error">
          {t('partners.warehouses.shiprocketUnreadable', { vars: { error: unreadable } })}
        </Alert>
      )}
    </Stack>
  );
}
