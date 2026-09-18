import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Chip, Stack } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';

import { useCart } from '../../../app/providers/CartProvider';
import type { StoreCart } from '../../../graphql/cart';
import { useStoreT } from '../../../i18n';
import { makeCouponSchema, type CouponValues } from './coupon.types';

/** Apply a coupon to the cart, or show the one applied with a way to remove it. */
export function CouponForm({ cart }: Readonly<{ cart: StoreCart }>) {
  const { t } = useStoreT();
  const { applyCoupon } = useCart();
  const schema = useMemo(() => makeCouponSchema(t), [t]);
  const { control, handleSubmit, setError, reset, formState } = useForm<CouponValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  const submit = handleSubmit(async ({ code }) => {
    const refusal = await applyCoupon(code.toUpperCase());
    if (refusal) setError('code', { message: refusal });
    else reset({ code: '' });
  });

  if (cart.coupon_code) {
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip
            icon={<LocalOfferOutlinedIcon />}
            label={t('ecommStore.coupon.applied', { vars: { code: cart.coupon_code } })}
            color={cart.coupon_error ? 'warning' : 'success'}
            variant="outlined"
          />
          <DuncitButton size="small" onClick={() => applyCoupon('')}>
            {t('ecommStore.coupon.remove')}
          </DuncitButton>
        </Stack>
        {cart.coupon_error ? <Alert severity="warning">{cart.coupon_error}</Alert> : null}
      </Stack>
    );
  }
  return (
    <Stack component="form" direction="row" spacing={1} onSubmit={submit} noValidate sx={{ alignItems: 'flex-start' }}>
      <RhfTextField
        control={control}
        name="code"
        size="small"
        label={t('ecommStore.coupon.label')}
        hint={t('ecommStore.coupon.hint')}
        autoComplete="off"
      />
      <DuncitButton type="submit" variant="outlined" loading={formState.isSubmitting} sx={{ minHeight: 40 }}>
        {t('ecommStore.coupon.apply')}
      </DuncitButton>
    </Stack>
  );
}
