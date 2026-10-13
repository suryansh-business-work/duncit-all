import { Alert, AlertTitle, Divider, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { formatFoodMoney } from '@duncit/utils';
import ResponsiveDialog from '../../../components/ResponsiveDialog';
import { useTranslation } from '../../../i18n/useTranslation';
import DietMark from './DietMark';
import { FoodCheckoutForm, type FoodCheckoutValues } from './food-checkout';
import FoodTotals from './FoodTotals';
import QuantityStepper from './QuantityStepper';
import type { FoodCart } from './useFoodCart';
import type { FoodCheckoutError } from './useFoodCheckout';

interface Props {
  open: boolean;
  onClose: () => void;
  cart: FoodCart;
  currency: string;
  discountPct: number;
  guest: FoodCheckoutValues;
  submitting: boolean;
  error: FoodCheckoutError | null;
  onDismissError: () => void;
  onPay: (values: FoodCheckoutValues) => void | Promise<void>;
}

const FORM_ID = 'food-checkout-form';

/**
 * The cart: each dish with its stepper and a remove, the bill, then who the
 * order is for — and Pay, which opens the venue's payment sheet. A closed or
 * declined payment lands back here with the cart intact.
 */
export default function FoodCartSheet({
  open,
  onClose,
  cart,
  currency,
  discountPct,
  guest,
  submitting,
  error,
  onDismissError,
  onPay,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
              <QuantityStepper
                name={item.name}
                quantity={quantity}
                onChange={(next) => cart.setQuantity(item.id, next)}
                disabled={submitting}
                testId={`food-cart-stepper-${item.id}`}
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
        <FoodTotals
          subtotal={price.subtotal}
          discount={price.discount}
          discountPct={discountPct}
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
        <FoodCheckoutForm formId={FORM_ID} initial={guest} disabled={submitting} onSubmit={onPay} />
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
