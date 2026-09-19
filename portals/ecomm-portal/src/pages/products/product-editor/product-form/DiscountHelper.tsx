import { useState, type ChangeEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { toNumber } from '../../../../lib/format';
import type { ProductControl, ProductSetValue } from './product.types';

/** The selling price after taking `pct` off the MRP, rounded to the paisa. */
const priceOff = (mrp: number, pct: number): string => String(Math.round(mrp * (1 - pct / 100) * 100) / 100);

/** How far below the MRP the price sits, as a whole percentage — null when it is not below it. */
const discountOf = (mrp: number, price: number): number | null => (mrp > price ? Math.round((1 - price / mrp) * 100) : null);

/**
 * A shortcut, not a saved value: type a percentage and the selling price is
 * set from the MRP. It needs an MRP to work from, so it waits for one.
 */
export default function DiscountHelper({ control, setValue }: Readonly<{ control: ProductControl; setValue: ProductSetValue }>) {
  const { t } = useTranslation();
  const [pct, setPct] = useState('');
  const mrp = toNumber(useWatch({ control, name: 'mrp' }));
  const price = toNumber(useWatch({ control, name: 'price' }));
  const hasMrp = mrp > 0;
  const current = hasMrp ? discountOf(mrp, price) : null;
  const hint = hasMrp ? t('ecommPortal.productEditor.discountHint') : t('ecommPortal.productEditor.discountNeedsMrp');

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setPct(next);
    const value = Number.parseFloat(next);
    if (!hasMrp || !Number.isFinite(value) || value < 0 || value > 100) return;
    setValue('price', priceOff(mrp, value), { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Stack spacing={0.5}>
      <TextField
        label={t('ecommPortal.productEditor.discountPct')}
        value={pct}
        onChange={onChange}
        disabled={!hasMrp}
        helperText={hint}
        fullWidth
        slotProps={{
          htmlInput: { inputMode: 'decimal' },
          input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
        }}
        data-testid="product-discount-pct"
      />
      {current !== null && (
        <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }} data-testid="product-current-discount">
          {t('ecommPortal.productEditor.currentDiscount', { vars: { pct: current } })}
        </Typography>
      )}
    </Stack>
  );
}
