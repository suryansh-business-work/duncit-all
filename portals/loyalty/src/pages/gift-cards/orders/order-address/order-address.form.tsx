import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import {
  makeOrderAddressSchema,
  orderAddressValues,
  type OrderAddressFormProps,
  type OrderAddressValues,
} from './order-address.types';

const TITLE_ID = 'order-address-title';
const ROW = { xs: 'column', sm: 'row' } as const;

/** Correct where a printed order ships to — only before the courier is booked. */
export default function OrderAddressForm({ open, address, busy, errorMessage, onCancel, onSubmit }: Readonly<OrderAddressFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeOrderAddressSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<OrderAddressValues>({
    resolver: zodResolver(schema),
    defaultValues: orderAddressValues(address),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(orderAddressValues(address));
  }, [open, address, reset]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} aria-labelledby={TITLE_ID} fullWidth maxWidth="sm">
      <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="order-address-form">
        <DialogTitle id={TITLE_ID}>{t('loyalty.giftOrders.addressTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <Stack direction={ROW} spacing={2}>
              <RhfTextField control={control} name="name" label={t('shell.common.name')} required />
              <RhfTextField control={control} name="phone" label={t('shell.common.phone')} required slotProps={{ htmlInput: { inputMode: 'tel' } }} />
            </Stack>
            <RhfTextField control={control} name="line1" label={t('loyalty.giftOrders.addressLine1')} required />
            <RhfTextField control={control} name="line2" label={t('loyalty.giftOrders.addressLine2')} />
            <RhfTextField control={control} name="landmark" label={t('loyalty.giftOrders.addressLandmark')} />
            <Stack direction={ROW} spacing={2}>
              <RhfTextField control={control} name="city" label={t('loyalty.giftOrders.addressCity')} required />
              <RhfTextField control={control} name="state" label={t('loyalty.giftOrders.addressState')} required />
            </Stack>
            <Stack direction={ROW} spacing={2}>
              <RhfTextField control={control} name="pincode" label={t('loyalty.giftOrders.addressPincode')} required slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
              <RhfTextField control={control} name="country" label={t('loyalty.giftOrders.addressCountry')} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} data-testid="order-address-submit">
            {t('shell.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
