import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
import { FoodCouponActiveField, FoodCouponCodeField, FoodCouponDateField } from './food-coupon-fields';
import { makeFoodCouponSchema, type FoodCouponFormValues } from './food-coupon.types';

interface Props {
  defaultValues: FoodCouponFormValues;
  busy: boolean;
  /** The server's refusal (a code the venue already uses, say), kept above the fields so nothing typed is lost. */
  apiError?: string | null;
  onSubmit: (values: FoodCouponFormValues) => void;
  onCancel: () => void;
}

const WHOLE_NUMBER_INPUT = { htmlInput: { inputMode: 'numeric' } } as const;
const AMOUNT_INPUT = { htmlInput: { inputMode: 'decimal' } } as const;

/** Create or edit one of a venue's food coupons: the code, what it takes off, and when and how often it works. */
export default function FoodCouponForm({ defaultValues, busy, apiError = null, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodCouponSchema(t), [t]);
  const { control, handleSubmit } = useForm<FoodCouponFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });
  const validFrom = useWatch({ control, name: 'valid_from' });

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="food-coupon-form">
      {apiError && (
        <Alert severity="error" data-testid="food-coupon-error">
          {apiError}
        </Alert>
      )}
      <FoodCouponCodeField control={control} />
      <RhfTextField
        control={control}
        name="description"
        label={t('venueFoodOwner.common.description')}
        hint={t('venueFoodOwner.coupons.descriptionHint')}
        multiline
        minRows={2}
        data-testid="food-coupon-description"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="discount_pct"
          label={t('venueFoodOwner.coupons.discountPct')}
          hint={t('venueFoodOwner.coupons.discountHint', { vars: { max: FOOD_ORDER_LIMITS.maxDiscountPct } })}
          required
          slotProps={WHOLE_NUMBER_INPUT}
          data-testid="food-coupon-discount"
        />
        <RhfTextField
          control={control}
          name="min_order_amount"
          label={t('venueFoodOwner.coupons.minOrder')}
          hint={t('venueFoodOwner.coupons.minOrderHint')}
          slotProps={AMOUNT_INPUT}
          data-testid="food-coupon-min-order"
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FoodCouponDateField
          control={control}
          name="valid_from"
          label={t('venueFoodOwner.coupons.validFrom')}
          hint={t('venueFoodOwner.coupons.validFromHint')}
        />
        <FoodCouponDateField
          control={control}
          name="valid_until"
          label={t('venueFoodOwner.coupons.validUntil')}
          hint={t('venueFoodOwner.coupons.validUntilHint')}
          minDateTime={validFrom}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="max_uses"
          label={t('venueFoodOwner.coupons.maxUses')}
          hint={t('venueFoodOwner.coupons.maxUsesHint')}
          slotProps={WHOLE_NUMBER_INPUT}
          data-testid="food-coupon-max-uses"
        />
        <RhfTextField
          control={control}
          name="per_phone_limit"
          label={t('venueFoodOwner.coupons.perPerson')}
          hint={t('venueFoodOwner.coupons.perPersonHint')}
          slotProps={WHOLE_NUMBER_INPUT}
          data-testid="food-coupon-per-person"
        />
      </Stack>
      <FoodCouponActiveField control={control} />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('venueFoodOwner.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid="food-coupon-save">
          {t('venueFoodOwner.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
