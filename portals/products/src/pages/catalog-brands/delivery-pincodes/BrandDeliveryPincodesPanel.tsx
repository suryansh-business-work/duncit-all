import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { useApolloTableFetch } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import BrandDeliveryPincodesTable from './BrandDeliveryPincodesTable';
import { DeliveryPincodesForm } from './delivery-pincodes-form';
import {
  ADD_BRAND_DELIVERY_PINCODES,
  BRAND_DELIVERY_PINCODES_TABLE,
  REMOVE_BRAND_DELIVERY_PINCODES,
  SYNC_BRAND_DELIVERY_PINCODES,
  type BrandDeliveryPincodeRow,
} from './queries';

interface AddResult {
  addBrandDeliveryPincodes: { added: number; duplicates: number; invalid: string[] };
}

interface SyncResult {
  syncBrandDeliveryPincodes: {
    checked: number;
    serviceable: number;
    unserviceable: number;
    failed: number;
    total: number;
    unchecked: number;
  };
}

/**
 * Catalog > Brands > manage one brand: the pincodes the brand delivers to. An
 * empty list means everywhere; otherwise the Pod Shop shows the brand's
 * products only to buyers whose delivery pincode is listed and serviceable.
 * Sync checks each lane against ShipRocket from the brand's own warehouse.
 */
export default function BrandDeliveryPincodesPanel({ brandId }: Readonly<{ brandId: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BrandDeliveryPincodeRow | null>(null);
  const [addPincodes, addState] = useMutation<AddResult>(ADD_BRAND_DELIVERY_PINCODES);
  const [removePincodes, removeState] = useMutation(REMOVE_BRAND_DELIVERY_PINCODES);
  const [syncPincodes, syncState] = useMutation<SyncResult>(SYNC_BRAND_DELIVERY_PINCODES);

  const fetchRows = useApolloTableFetch<BrandDeliveryPincodeRow>(
    client,
    BRAND_DELIVERY_PINCODES_TABLE,
    'brandDeliveryPincodesTable',
    { extraVariables: { brandId } },
    [brandId],
  );

  const add = async (pincodes: string[]) => {
    try {
      const res = await addPincodes({ variables: { brandId, pincodes } });
      const { added = 0, duplicates = 0 } = res.data?.addBrandDeliveryPincodes ?? {};
      notifySuccess(t('products.deliveryPincodes.added', { vars: { added, duplicates } }));
      refetchRef.current?.();
      return true;
    } catch (error) {
      notifyError(parseApiError(error, t('products.deliveryPincodes.addFailed')));
      return false;
    }
  };

  const sync = async () => {
    try {
      const res = await syncPincodes({ variables: { brandId } });
      const r = res.data?.syncBrandDeliveryPincodes;
      if (r) notifySuccess(t('products.deliveryPincodes.synced', { vars: { ...r } }));
      refetchRef.current?.();
    } catch (error) {
      notifyError(parseApiError(error, t('products.deliveryPincodes.syncFailed')));
    }
  };

  const remove = async () => {
    /* v8 ignore next -- the dialog only opens once a row has been picked */
    if (!removeTarget) return;
    try {
      await removePincodes({ variables: { brandId, ids: [removeTarget.id] } });
      notifySuccess(t('products.deliveryPincodes.removed', { vars: { pincode: removeTarget.pincode } }));
      refetchRef.current?.();
    } catch (error) {
      notifyError(parseApiError(error, t('products.deliveryPincodes.removeFailed')));
    }
    setRemoveTarget(null);
  };

  const onRemove = useCallback((row: BrandDeliveryPincodeRow) => setRemoveTarget(row), []);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Stack spacing={0.5}>
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('products.deliveryPincodes.title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('products.deliveryPincodes.intro')}
              </Typography>
            </Stack>
            <DuncitButton
              size="small"
              startIcon={<SyncIcon />}
              disabled={syncState.loading}
              onClick={sync}
              sx={{ alignSelf: 'flex-start', flexShrink: 0 }}
            >
              {syncState.loading ? t('products.deliveryPincodes.syncing') : t('products.deliveryPincodes.sync')}
            </DuncitButton>
          </Stack>
          <DeliveryPincodesForm saving={addState.loading} onSubmit={add} />
          <BrandDeliveryPincodesTable fetchRows={fetchRows} refetchRef={refetchRef} onRemove={onRemove} />
        </Stack>
      </CardContent>
      <ConfirmDialog
        open={!!removeTarget}
        title={t('products.deliveryPincodes.removeTitle', { vars: { pincode: removeTarget?.pincode ?? '' } })}
        message={t('products.deliveryPincodes.removeMessage')}
        confirmLabel={t('shell.common.delete')}
        confirmColor="error"
        loading={removeState.loading}
        busyLabel={t('shell.common.deleting')}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
      />
    </Card>
  );
}
