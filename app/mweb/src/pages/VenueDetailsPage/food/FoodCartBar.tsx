import { Box, Fab, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { formatFoodMoney, type FoodCartPrice } from '@duncit/utils';
import { APP_SHELL_MAX_WIDTH } from '../../../app/appLayout';
import { STICKY_BAR_SX } from '../../../components/cart/stickyBarSx';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  price: FoodCartPrice;
  currency: string;
  onOpen: () => void;
}

/** The button's height; the menu keeps that much room under its last dish. */
const height = (theme: Theme) => theme.spacing(6);

/**
 * Spans the viewport above the bottom nav — the same offset the cart's own
 * checkout bar uses, so the nav, the safe-area inset and the app-install
 * banner are all cleared — and lets every tap but the button's through.
 */
const DOCK_SX = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: STICKY_BAR_SX.bottom,
  zIndex: (theme: Theme) => theme.zIndex.fab,
  pointerEvents: 'none',
} as const;

/** The app's column and its page gutter: on a wide screen the button stays at
 * the column's right edge, not the window's. */
const COLUMN_SX = {
  display: 'flex',
  justifyContent: 'flex-end',
  boxSizing: 'border-box',
  maxWidth: APP_SHELL_MAX_WIDTH,
  mx: 'auto',
  px: 2,
} as const;

/**
 * The venue menu's cart, floating in the bottom-right corner while it holds
 * anything: a cart mark, how many dishes and what they come to. It opens the
 * cart sheet. The count and the total are separate words so the button's
 * accessible name ("View cart, 2 items, ₹300") contains each of them as shown.
 */
export default function FoodCartBar({ price, currency, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const one = price.count === 1;
  const count = String(price.count);
  const total = formatFoodMoney(price.total, currency);
  return (
    <>
      <Box aria-hidden sx={{ height, flexShrink: 0 }} data-testid="food-cart-bar-spacer" />
      <Box sx={DOCK_SX} data-testid="food-cart-bar">
        <Box sx={COLUMN_SX}>
          <Fab
            variant="extended"
            color="primary"
            onClick={onOpen}
            aria-label={
              one
                ? t('mweb.cartControl.foodCartOpenOne', { vars: { total } })
                : t('mweb.cartControl.foodCartOpenMany', { vars: { count, total } })
            }
            sx={{ height, gap: 1, pointerEvents: 'auto' }}
            data-testid="food-cart-bar-open"
          >
            <ShoppingCartIcon />
            <Typography component="span" variant="body2" sx={{ fontWeight: 600 }} data-testid="food-cart-bar-count">
              {one ? t('mweb.cartControl.foodCartOne') : t('mweb.cartControl.foodCartMany', { vars: { count } })}
            </Typography>
            <Typography component="span" variant="body2" sx={{ fontWeight: 700 }} data-testid="food-cart-bar-total">
              {total}
            </Typography>
          </Fab>
        </Box>
      </Box>
    </>
  );
}
