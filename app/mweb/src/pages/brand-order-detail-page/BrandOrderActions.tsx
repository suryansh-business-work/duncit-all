import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import EditLocationAltRoundedIcon from '@mui/icons-material/EditLocationAltRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { DuncitButton } from '@duncit/buttons';
import { shipToValues } from '@duncit/forms/schemas';
import { brandOrderActions } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { BrandOrderDetail } from '../brand-orders-page/queries';
import BrandOrderDocuments from './BrandOrderDocuments';
import { ShipToForm } from './ship-to-form';
import { useBrandOrderActions } from './useBrandOrderActions';

/**
 * The order's actions — only those the shared rule (`brandOrderActions`) says
 * this order allows right now: book (or retry) the shipment, fix the address
 * before ShipRocket has it, print or save the label, invoice and manifest once
 * an AWB exists, and a
 * tracking refresh. Native twin: components/brand-orders/BrandOrderActions.
 */
export default function BrandOrderActions({ order }: Readonly<{ order: BrandOrderDetail }>) {
  const { t } = useTranslation();
  const allowed = brandOrderActions(order);
  const actions = useBrandOrderActions(order);
  const [editing, setEditing] = useState(false);
  const initial = useMemo(() => shipToValues(order.shipping_address), [order.shipping_address]);
  if (!allowed.book && !allowed.editAddress && !allowed.documents && !allowed.refreshTracking) return null;

  return (
    <Stack spacing={1.25} data-testid="brand-order-actions">
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
        {t('mweb.brandOrders.actions')}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {allowed.book && (
          <DuncitButton variant="contained" size="small" startIcon={<LocalShippingRoundedIcon />} disabled={actions.busy} onClick={actions.book} data-testid="brand-order-book">
            {t(order.last_error ? 'mweb.brandOrders.retryBooking' : 'mweb.brandOrders.book')}
          </DuncitButton>
        )}
        {allowed.editAddress && (
          <DuncitButton variant="outlined" size="small" startIcon={<EditLocationAltRoundedIcon />} disabled={actions.busy} onClick={() => setEditing(true)} data-testid="brand-order-fix-address">
            {t('mweb.brandOrders.fixAddress')}
          </DuncitButton>
        )}
        {allowed.refreshTracking && (
          <DuncitButton variant="outlined" size="small" startIcon={<SyncRoundedIcon />} disabled={actions.busy} onClick={actions.refreshTracking} data-testid="brand-order-refresh">
            {t('mweb.brandOrders.refreshTracking')}
          </DuncitButton>
        )}
      </Stack>
      {allowed.documents && <BrandOrderDocuments busy={actions.busy} onDocument={actions.document} />}
      <ShipToForm
        open={editing}
        initial={initial}
        saving={actions.saving}
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          if (await actions.saveAddress(values)) setEditing(false);
        }}
      />
    </Stack>
  );
}
