import { Stack, Typography } from '@mui/material';
import { foodPriceDisplay, foodSavingLabel, formatFoodMoney, type VenueFoodItem } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  item: Pick<VenueFoodItem, 'id' | 'price' | 'original_price' | 'saving_display'>;
  currency: string;
  /** The greyed look of a dish that is off for now. */
  dim?: { opacity: number };
}

/**
 * A dish's price — and, when the owner set an MRP above it, that MRP struck
 * through with the saving beside it ("20% off" / "₹40 off"). The decision is
 * @duncit/utils' `foodPriceDisplay`; the guest always pays the price shown first.
 */
export default function FoodItemPrice({ item, currency, dim }: Readonly<Props>) {
  const { t } = useTranslation();
  const shown = foodPriceDisplay(item);
  const money = (amount: number) => formatFoodMoney(amount, currency);

  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'baseline', flexWrap: 'wrap', ...dim }}>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }} data-testid={`food-item-price-${item.id}`}>
        {money(shown.price)}
      </Typography>
      {shown.originalPrice !== null && (
        <>
          <Typography
            component="s"
            variant="caption"
            sx={{ color: 'text.secondary' }}
            aria-label={t('mweb.venueFood.originalPrice', { vars: { amount: money(shown.originalPrice) } })}
            data-testid={`food-item-original-price-${item.id}`}
          >
            {money(shown.originalPrice)}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }} data-testid={`food-item-saving-${item.id}`}>
            {foodSavingLabel(t, shown.saving, money)}
          </Typography>
        </>
      )}
    </Stack>
  );
}
