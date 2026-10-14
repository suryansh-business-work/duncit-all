import { Alert, AlertTitle, Divider, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { CartQuantityControl } from '@duncit/ui';
import { FOOD_ORDER_LIMITS, foodTaxLine, formatFoodMoney } from '@duncit/utils';
import { useCartControlLabels } from '../../../components/cart/useCartControlLabels';
import ResponsiveDialog from '../../../components/ResponsiveDialog';
import { useTranslation } from '../../../i18n/useTranslation';
import DietMark from './DietMark';
import { FoodCheckoutForm, type FoodCheckoutValues } from './food-checkout';
import { FoodCouponForm } from './food-coupon';
import FoodCouponOffers from './FoodCouponOffers';
import FoodTotals from './FoodTotals';
import type { FoodCart } from './useFoodCart';
import type { FoodCheckoutError } from './useFoodCheckout';
import type { FoodCouponControl } from './useFoodCoupon';

interface Props {
  open: boolean;
  onClose: () => void;
  cart: FoodCart;
  currency: string;
  discountPct: number;
  venueId: string;
  venueName: string;
  guest: FoodCheckoutValues;
  coupon: FoodCouponControl;
  submitting: boolean;
  error: FoodCheckoutError | null;
  onDismissError: () => void;
  onPay: (values: FoodCheckoutValues) => void | Promise<void>;
}

const FORM_ID = 'food-checkout-form';

/**
 * The cart: each dish with its stepper and a remove, the venue's coupon, the
 * bill, then who the order is for — and Pay, which opens the venue's payment
 * sheet. A closed or declined payment lands back here with the cart intact.
 */
export default function FoodCartSheet({
  open,
  onClose,
  cart,
  currency,
  discountPct,
  venueId,
  venueName,
  guest,
  coupon,
  submitting,
  error,
  onDismissError,
  onPay,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const cartLabels = useCartControlLabels();
  const money = (amount: number) => formatFoodMoney(amount, currency);
  const { price } = cart;

  const payButton = (
    <DuncitButton
      type="submit"
      form={FORM_ID}
      variant="contained"
      size="large"
      fullWidth
      loading={submitting}
      disabled={submitting || price.belowMinimum}
      data-testid="food-cart-pay"
    >
      {t('mweb.venueFood.checkout.pay', { vars: { total: money(price.total) } })}
    </DuncitButton>
  );

  return (
    <ResponsiveDialog
      open={open}
      // Closing mid-payment would hide the only place its outcome is shown.
      onClose={submitting ? () => undefined : onClose}
      title={t('mweb.venueFood.cart.title')}
      actions={payButton}
      testId="food-cart-sheet"
    >
      <Stack spacing={2}>
        <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {cart.lines.map(({ item, quantity }) => (
            <Stack key={item.id} component="li" direction="row" spacing={1} sx={{ alignItems: 'center' }} data-testid={`food-cart-line-${item.id}`}>
              <DietMark diet={item.diet} />
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                  {item.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('mweb.venueFood.cart.qtyPrice', { vars: { qty: String(quantity), price: money(item.price) } })}
                </Typography>
              </Stack>
              <CartQuantityControl
                size="small"
                quantity={quantity}
                max={FOOD_ORDER_LIMITS.maxQuantity}
                labels={cartLabels(item.name)}
                onChange={(next) => cart.setQuantity(item.id, next)}
                disabled={submitting}
                testIdPrefix={`food-cart-line-${item.id}`}
              />
              <DuncitIconButton
                aria-label={t('mweb.venueFood.removeItem', { vars: { name: item.name } })}
                onClick={() => cart.setQuantity(item.id, 0)}
                disabled={submitting}
                data-testid={`food-cart-remove-${item.id}`}
              >
                <DeleteIcon fontSize="small" />
              </DuncitIconButton>
            </Stack>
          ))}
        </Stack>
        <FoodCouponOffers venueId={venueId} coupon={coupon} currency={currency} disabled={submitting} />
        <FoodCouponForm coupon={coupon} price={price} currency={currency} disabled={submitting} />
        <FoodTotals
          subtotal={price.subtotal}
          discount={price.discount}
          discountPct={discountPct}
          coupon={
            cart.coupon && price.coupon > 0
              ? { code: cart.coupon.coupon_code, pct: cart.coupon.coupon_pct, amount: price.coupon }
              : null
          }
          tax={foodTaxLine(price.taxMode, price.gstPct, price.tax)}
          total={price.total}
          currency={currency}
          testId="food-cart-totals"
        />
        {price.belowMinimum && (
          <Alert severity="info" data-testid="food-cart-below-minimum">
            {t('mweb.venueFood.cart.belowMinimum')}
          </Alert>
        )}
        <Divider />
        <FoodCheckoutForm formId={FORM_ID} venueName={venueName} initial={guest} disabled={submitting} onSubmit={onPay} />
        {error && (
          <Alert severity="error" onClose={onDismissError} data-testid="food-cart-error">
            {error.title && <AlertTitle>{error.title}</AlertTitle>}
            {error.message}
          </Alert>
        )}
      </Stack>
    </ResponsiveDialog>
  );
}
