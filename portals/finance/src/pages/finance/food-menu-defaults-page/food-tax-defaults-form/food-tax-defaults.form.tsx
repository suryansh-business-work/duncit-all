import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { makeFoodTaxDefaultsSchema } from '@duncit/forms/schemas';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { FOOD_GST_LIMITS } from '@duncit/utils';
import type { FoodTaxDefaultsFormProps, FoodTaxDefaultsOutput, FoodTaxDefaultsValues } from './food-tax-defaults.types';

const MODE_LABEL_ID = 'food-tax-defaults-mode-label';
const MODE_HINT_ID = 'food-tax-defaults-mode-hint';

/** Finance's default GST on venue food: inside the menu prices or added to them, and at what percent. */
export default function FoodTaxDefaultsForm({ values, busy, errorMessage, onSubmit }: Readonly<FoodTaxDefaultsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodTaxDefaultsSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<FoodTaxDefaultsValues, unknown, FoodTaxDefaultsOutput>({
    defaultValues: values,
    resolver: zodResolver(schema) as unknown as Resolver<FoodTaxDefaultsValues, unknown, FoodTaxDefaultsOutput>,
    mode: 'onBlur',
  });

  // A save answers with what was stored; the form re-opens on it, clean.
  useEffect(() => {
    reset(values);
  }, [values, reset]);

  return (
    <form noValidate onSubmit={handleSubmit((output) => onSubmit(output))} data-testid="food-tax-defaults-form">
      <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
        {errorMessage && (
          <Alert severity="error" data-testid="food-tax-defaults-error">
            {errorMessage}
          </Alert>
        )}

        <Controller
          control={control}
          name="tax_mode"
          render={({ field, fieldState }) => (
            <FormControl error={Boolean(fieldState.error)}>
              <FormLabel id={MODE_LABEL_ID}>{t('shell.foodTax.taxMode')}</FormLabel>
              <RadioGroup
                {...field}
                aria-labelledby={MODE_LABEL_ID}
                aria-describedby={MODE_HINT_ID}
                data-testid="food-tax-defaults-mode"
              >
                <FormControlLabel value="INCLUSIVE" control={<Radio />} label={t('shell.foodTax.inclusive')} />
                <FormControlLabel value="EXCLUSIVE" control={<Radio />} label={t('shell.foodTax.exclusive')} />
              </RadioGroup>
              <FormHelperText id={MODE_HINT_ID}>
                {fieldState.error?.message ?? t('finance.foodMenuDefaults.modeHint')}
              </FormHelperText>
            </FormControl>
          )}
        />

        <RhfTextField
          control={control}
          name="gst_pct"
          label={t('shell.foodTax.gstPct')}
          hint={t('finance.foodMenuDefaults.gstHint', { vars: { min: FOOD_GST_LIMITS.min, max: FOOD_GST_LIMITS.max } })}
          type="number"
          fullWidth={false}
          sx={{ maxWidth: 200 }}
          slotProps={{ htmlInput: { min: FOOD_GST_LIMITS.min, max: FOOD_GST_LIMITS.max, step: 1 } }}
          data-testid="food-tax-defaults-gst"
        />

        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton
            type="submit"
            variant="contained"
            loading={busy}
            disabled={!formState.isDirty || busy}
            data-testid="food-tax-defaults-save"
          >
            {busy ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
