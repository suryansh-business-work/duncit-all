import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
import RhfTextField from '../../../../forms/components/RhfTextField';
import { useTranslation } from '../../../../i18n/useTranslation';
import { makeFoodCheckoutSchema, type FoodCheckoutFormProps, type FoodCheckoutValues } from './food-checkout.types';

/**
 * Who the order is for and where it goes: name, mobile, and optionally the
 * table and a note for the kitchen (React Hook Form + Zod). No sign-in — the
 * guest is standing at the table.
 */
export default function FoodCheckoutForm({ formId, initial, disabled, onSubmit }: Readonly<FoodCheckoutFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodCheckoutSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FoodCheckoutValues, unknown, FoodCheckoutValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<FoodCheckoutValues, unknown, FoodCheckoutValues>,
    mode: 'onTouched',
  });

  // The account's details can arrive after the sheet opens; they fill the form
  // only while the guest has not typed over them.
  useEffect(() => {
    if (!isDirty) reset(initial);
  }, [initial, isDirty, reset]);

  return (
    <Stack component="form" id={formId} noValidate onSubmit={handleSubmit(onSubmit)} spacing={1} data-testid="food-checkout-form">
      <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 600 }}>
        {t('mweb.venueFood.checkout.title')}
      </Typography>
      <RhfTextField
        control={control}
        name="name"
        label={t('mweb.venueFood.checkout.name')}
        required
        autoComplete="name"
        size="small"
        disabled={disabled}
        slotProps={{ htmlInput: { maxLength: FOOD_ORDER_LIMITS.nameMax } }}
      />
      <RhfTextField
        control={control}
        name="phone"
        label={t('mweb.venueFood.checkout.phone')}
        hint={t('mweb.venueFood.checkout.phoneHint')}
        required
        digitsOnly
        type="tel"
        autoComplete="tel-national"
        size="small"
        disabled={disabled}
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: FOOD_ORDER_LIMITS.phoneLength } }}
      />
      <RhfTextField
        control={control}
        name="table"
        label={t('mweb.venueFood.checkout.table')}
        hint={t('mweb.venueFood.checkout.tableHint')}
        size="small"
        disabled={disabled}
        slotProps={{ htmlInput: { maxLength: FOOD_ORDER_LIMITS.tableMax } }}
      />
      <RhfTextField
        control={control}
        name="note"
        label={t('mweb.venueFood.checkout.note')}
        hint={t('mweb.venueFood.checkout.noteHint')}
        multiline
        minRows={2}
        size="small"
        disabled={disabled}
        slotProps={{ htmlInput: { maxLength: FOOD_ORDER_LIMITS.noteMax } }}
      />
    </Stack>
  );
}
