import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { makeShipToSchema } from '@duncit/forms/schemas';
import AddressFields from '../../../forms/components/AddressFields';
import RhfTextField from '../../../forms/components/RhfTextField';
import { fallbackT, type Translate } from '../../../i18n/fallback';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ShipToFormProps, ShipToFormValues } from './ship-to.types';

/** The courier ship-to rules — @duncit/forms', the same the native sheet and the server hold. */
export const makeShipToFormSchema = (t: Translate = fallbackT) => makeShipToSchema(t);

export const shipToFormSchema = makeShipToFormSchema();

const ADDRESS_NAMES = {
  line1: 'line1',
  line2: 'line2',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  country: 'country',
} as const;

/** Brand Orders → Fix address: correct an order's delivery address before
 * ShipRocket has it (React Hook Form + Zod). Native twin: BrandShipToSheet. */
export default function ShipToForm({ open, initial, saving, onCancel, onSubmit }: Readonly<ShipToFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeShipToFormSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<ShipToFormValues, unknown, ShipToFormValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<ShipToFormValues, unknown, ShipToFormValues>,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onCancel} fullWidth maxWidth="xs" data-testid="ship-to-form">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.addressTitle')}</DialogTitle>
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={1.5}>
            <DialogContentText variant="body2">{t('mweb.brandOrders.addressHint')}</DialogContentText>
            <RhfTextField control={control} name="name" label={t('mweb.brandOrders.recipientName')} required autoComplete="name" size="small" />
            <RhfTextField control={control} name="phone" label={t('mweb.brandOrders.phone')} required autoComplete="tel" size="small" />
            <AddressFields control={control} names={ADDRESS_NAMES} size="small" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onCancel} disabled={saving} data-testid="ship-to-cancel">
            {t('mweb.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={saving} data-testid="ship-to-save">
            {t('mweb.brandOrders.saveAddress')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
