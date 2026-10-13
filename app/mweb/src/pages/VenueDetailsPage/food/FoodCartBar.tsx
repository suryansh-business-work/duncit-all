import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatFoodMoney, type FoodCartPrice } from '@duncit/utils';
import { STICKY_BAR_SX } from '../../../components/cart/stickyBarSx';
import { useTranslation } from '../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../theme';

interface Props {
  price: FoodCartPrice;
  currency: string;
  onOpen: () => void;
}

/**
 * The cart, pinned under the menu while it holds anything: how many dishes,
 * what they come to, and the way into the cart. The summary is a live region,
 * so each Add is heard as well as seen.
 */
export default function FoodCartBar({ price, currency, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const items =
    price.count === 1
      ? t('mweb.venueFood.cart.itemsOne')
      : t('mweb.venueFood.cart.itemsMany', { vars: { count: String(price.count) } });
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ ...STICKY_BAR_SX, ...SURFACE_SX, p: 1.5, alignItems: 'center', justifyContent: 'space-between' }}
      data-testid="food-cart-bar"
    >
      <Typography aria-live="polite" aria-atomic="true" sx={{ fontWeight: 600, minWidth: 0 }} data-testid="food-cart-bar-summary">
        {t('mweb.venueFood.cart.barSummary', { vars: { items, total: formatFoodMoney(price.total, currency) } })}
      </Typography>
      <DuncitButton variant="contained" onClick={onOpen} sx={{ flexShrink: 0 }} data-testid="food-cart-bar-open">
        {t('mweb.venueFood.cart.viewCart')}
      </DuncitButton>
    </Stack>
  );
}
