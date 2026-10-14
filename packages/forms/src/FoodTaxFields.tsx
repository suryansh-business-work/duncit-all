import { Controller, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack, Switch } from '@mui/material';
import { FOOD_GST_LIMITS, VENUE_FOOD_TAX_MODES } from '@duncit/utils';
import RhfTextField from './RhfTextField';

/** The portal's `t` — the words are `shell.foodTax.*`, which every portal ships. */
export type FoodTaxTranslate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** `TOut` is whatever the form's resolver transforms the values into — the fields only read and write `T`. */
export interface FoodTaxFieldsProps<T extends FieldValues, TOut = T> {
  control: Control<T, unknown, TOut>;
  t: FoodTaxTranslate;
  /** Where the venue's food ordering sits in the form, e.g. `food_ordering` — it holds `tax_override`, `tax_mode` and `gst_pct`. */
  prefix: string;
  /** Prefixes every element's test id, and keeps the ids of two forms on one page apart. */
  idPrefix: string;
}

const MODE_KEYS = { INCLUSIVE: 'shell.foodTax.inclusive', EXCLUSIVE: 'shell.foodTax.exclusive' } as const;

/**
 * A venue's own GST on its QR orders — the owner's form (Partners) and the
 * Venues console show the same three controls. Off, the venue follows Duncit
 * Finance's default: the mode and percent stay visible, read-only, as the
 * server resolved them. On, they price every order. The rules are
 * `makeVenueFoodTaxRefinement` from `@duncit/forms/schemas`.
 */
export default function FoodTaxFields<T extends FieldValues, TOut = T>({
  control,
  t,
  prefix,
  idPrefix,
}: Readonly<FoodTaxFieldsProps<T, TOut>>) {
  const name = (field: 'tax_override' | 'tax_mode' | 'gst_pct') => `${prefix}.${field}` as Path<T>;
  const override = useWatch({ control, name: name('tax_override') }) === true;
  const hintId = `${idPrefix}-tax-override-hint`;
  const modeLabelId = `${idPrefix}-tax-mode-label`;

  return (
    <Stack spacing={1.25} data-testid={`${idPrefix}-tax`}>
      <Controller
        control={control}
        name={name('tax_override')}
        render={({ field }) => (
          <Stack spacing={0}>
            <FormControlLabel
              control={
                <Switch
                  checked={field.value === true}
                  onChange={(_, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  slotProps={{ input: { 'aria-describedby': hintId } }}
                  data-testid={`${idPrefix}-tax-override`}
                />
              }
              label={t('shell.foodTax.override')}
            />
            <FormHelperText id={hintId} sx={{ mt: 0 }}>
              {t('shell.foodTax.overrideHint')}
            </FormHelperText>
          </Stack>
        )}
      />
      <Controller
        control={control}
        name={name('tax_mode')}
        render={({ field, fieldState }) => (
          <FormControl error={Boolean(fieldState.error)} disabled={!override}>
            <FormLabel id={modeLabelId}>{t('shell.foodTax.taxMode')}</FormLabel>
            <RadioGroup {...field} row aria-labelledby={modeLabelId} data-testid={`${idPrefix}-tax-mode`}>
              {VENUE_FOOD_TAX_MODES.map((mode) => (
                <FormControlLabel key={mode} value={mode} control={<Radio />} label={t(MODE_KEYS[mode])} />
              ))}
            </RadioGroup>
            {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
          </FormControl>
        )}
      />
      <RhfTextField
        control={control}
        name={name('gst_pct')}
        label={t('shell.foodTax.gstPct')}
        type="number"
        size="small"
        disabled={!override}
        fullWidth={false}
        sx={{ maxWidth: 200 }}
        slotProps={{ htmlInput: { min: FOOD_GST_LIMITS.min, max: FOOD_GST_LIMITS.max, step: 1 } }}
        data-testid={`${idPrefix}-tax-gst`}
      />
    </Stack>
  );
}
