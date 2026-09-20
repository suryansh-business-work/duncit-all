import {
  Controller,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormSetValue,
} from 'react-hook-form';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, Typography } from '@mui/material';
import { PACKAGE_TYPES, PACKAGING_PRESETS, parcelWeights, type PackagingPreset } from '@duncit/utils';
import RhfTextField from './RhfTextField';

/** The portal's `t` — keys live in `@duncit/i18n`'s PACKAGING_BUNDLE (rule 38). */
export type PackagingTranslate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** The form's control, whatever its resolver transforms the values into. */
type AnyControl<T extends FieldValues> = Control<T, unknown, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PackagingFieldsProps<T extends FieldValues> {
  control: AnyControl<T>;
  setValue: UseFormSetValue<T>;
  t: PackagingTranslate;
  /** Path prefix for a nested parcel, e.g. `variants.2.`; '' for the form's own fields. */
  prefix?: string;
  /** Also render the product-wide fields (type, HSN, fragile/liquid, shelf life). Off for a variant row. */
  productFields?: boolean;
  /** Mark the four measurements required: the asterisk on each label. Whether blank is refused stays with the consumer schema. */
  required?: boolean;
}

const DIMS = [
  { key: 'weight_kg', label: 'packaging.weight', step: 0.01 },
  { key: 'length_cm', label: 'packaging.length', step: 0.1 },
  { key: 'breadth_cm', label: 'packaging.breadth', step: 0.1 },
  { key: 'height_cm', label: 'packaging.height', step: 0.1 },
] as const;

type PathOf = (key: string) => string;

interface ProductFieldsProps<T extends FieldValues> {
  control: AnyControl<T>;
  t: PackagingTranslate;
  path: PathOf;
}

/** Package type, HSN code, fragile/liquid and shelf life — product-wide, so never per variant. */
function ProductPackagingFields<T extends FieldValues>({ control, t, path }: Readonly<ProductFieldsProps<T>>) {
  const flag = (key: 'is_fragile' | 'is_liquid', label: string) => (
    <Controller
      control={control}
      name={path(key) as Path<T>}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox checked={!!field.value} onChange={(event) => field.onChange(event.target.checked)} />}
          label={t(label)}
        />
      )}
    />
  );
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <RhfTextField control={control} name={path('package_type') as Path<T>} select label={t('packaging.packageType')}>
        {PACKAGE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {t(`packaging.type.${type}`)}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField
        control={control}
        name={path('hsn_code') as Path<T>}
        label={t('packaging.hsn')}
        hint={t('packaging.hsnHint')}
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
      />
      <RhfTextField
        control={control}
        name={path('shelf_life_days') as Path<T>}
        type="number"
        label={t('packaging.shelfLife')}
        hint={t('packaging.shelfLifeHint')}
        slotProps={{ htmlInput: { min: 0, step: 1 } }}
      />
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {flag('is_fragile', 'packaging.fragile')}
        {flag('is_liquid', 'packaging.liquid')}
      </Stack>
    </Box>
  );
}

/**
 * "Shipping & packaging": the packed parcel of one unit (weight and L × B × H),
 * one-click presets for the common pet-store packs, and a live readout of what
 * the courier will bill — with a warning when the box out-weighs its contents.
 * The values stay the form's own: validation belongs to the consumer's schema.
 */
export default function PackagingFields<T extends FieldValues>({
  control,
  setValue,
  t,
  prefix = '',
  productFields = true,
  required,
}: Readonly<PackagingFieldsProps<T>>) {
  const path: PathOf = (key) => `${prefix}${key}`;
  const [weight, length, breadth, height] = useWatch({ control, name: DIMS.map((d) => path(d.key)) as Path<T>[] });
  const weights = parcelWeights({
    weight_kg: Number(weight),
    length_cm: Number(length),
    breadth_cm: Number(breadth),
    height_cm: Number(height),
  });
  const set = (key: string, value: unknown) =>
    setValue(path(key) as Path<T>, value as PathValue<T, Path<T>>, { shouldDirty: true, shouldValidate: true });
  // Written as text, exactly what typing into the box gives — the forms keep numbers as text until submit.
  const applyPreset = (preset: PackagingPreset) => {
    for (const d of DIMS) set(d.key, String(preset[d.key]));
    if (productFields) set('package_type', preset.package_type);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" component="p">
          {t('packaging.presets')}
        </Typography>
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {PACKAGING_PRESETS.map((preset) => (
            <Button key={preset.id} size="small" variant="outlined" onClick={() => applyPreset(preset)}>
              {t(preset.labelKey)}
            </Button>
          ))}
        </Stack>
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        {DIMS.map((d) => (
          <RhfTextField
            key={d.key}
            control={control}
            name={path(d.key) as Path<T>}
            type="number"
            label={t(d.label)}
            required={required}
            slotProps={{ htmlInput: { min: 0, step: d.step, inputMode: 'decimal' } }}
          />
        ))}
      </Box>
      <Typography role="status" aria-live="polite" variant="body2" sx={{ fontWeight: 700 }}>
        {t('packaging.chargeable', { vars: { kg: weights.chargeable } })}
      </Typography>
      {weights.boxHeavier ? (
        <Alert severity="warning">{t('packaging.boxHeavier', { vars: { kg: weights.chargeable } })}</Alert>
      ) : null}
      {productFields ? <ProductPackagingFields control={control} t={t} path={path} /> : null}
    </Stack>
  );
}
