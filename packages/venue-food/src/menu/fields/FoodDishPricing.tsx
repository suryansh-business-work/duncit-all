import { useQuery } from '@apollo/client/react';
import { useWatch, type FieldValues } from 'react-hook-form';
import { MenuItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { FOOD_SAVING_DISPLAYS, foodPriceDisplay, foodSavingLabel, formatFoodMoney } from '@duncit/utils';
import { FOOD_CURRENCY } from '../../documents';
import { dishPath, type FoodControlProps } from './food-paths';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  index: number;
  priceMax: number;
  idPrefix: string;
}

const SAVING_DISPLAY_KEYS: Record<(typeof FOOD_SAVING_DISPLAYS)[number], string> = {
  PERCENT: 'venueFoodOwner.menu.savingDisplayPercent',
  AMOUNT: 'venueFoodOwner.menu.savingDisplayAmount',
};

const priceInput = (max: number) => ({ htmlInput: { min: 1, max, step: 'any', inputMode: 'decimal' as const } });

/**
 * A dish's price, its optional struck-through MRP and how the saving reads —
 * with the line the guest will see. The saving is display only: what the guest
 * pays is always the price (@duncit/utils `foodPriceDisplay`).
 */
export default function FoodDishPricing<T extends FieldValues, TOut = T>({ control, index, priceMax, idPrefix }: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const currency = useQuery(FOOD_CURRENCY).data?.publicFinanceSettings?.currency_symbol ?? '';
  const [price, original, display] = useWatch({
    control,
    name: [dishPath<T>(index, 'price'), dishPath<T>(index, 'original_price'), dishPath<T>(index, 'saving_display')],
  }) as unknown[];
  const shown = foodPriceDisplay({
    price: typeof price === 'number' || typeof price === 'string' ? price : '',
    original_price: typeof original === 'number' || typeof original === 'string' ? original : null,
    saving_display: typeof display === 'string' ? display : null,
  });
  const money = (amount: number) => formatFoodMoney(amount, currency);

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <RhfTextField
          control={control}
          name={dishPath<T>(index, 'price')}
          data-testid={`${idPrefix}-food-item-${index}-price`}
          label={t('venueFoodOwner.menu.price')}
          type="number"
          required
          size="small"
          slotProps={priceInput(priceMax)}
        />
        <RhfTextField
          control={control}
          name={dishPath<T>(index, 'original_price')}
          label={t('venueFoodOwner.menu.originalPrice')}
          hint={t('venueFoodOwner.menu.originalPriceHint')}
          type="number"
          size="small"
          slotProps={priceInput(priceMax)}
        />
        <RhfTextField
          control={control}
          name={dishPath<T>(index, 'saving_display')}
          label={t('venueFoodOwner.menu.savingDisplay')}
          select
          size="small"
        >
          {FOOD_SAVING_DISPLAYS.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {t(SAVING_DISPLAY_KEYS[mode])}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
      {shown.originalPrice !== null && (
        <Typography variant="body2" aria-live="polite" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.menu.pricePreview')}:{' '}
          <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {money(shown.price)}
          </Typography>{' '}
          <Typography component="s" variant="body2">
            {money(shown.originalPrice)}
          </Typography>{' '}
          <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
            {foodSavingLabel(t, shown.saving, money, 'owner')}
          </Typography>
        </Typography>
      )}
    </Stack>
  );
}
