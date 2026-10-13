import { YStack } from 'tamagui';
import { formatFoodMoney } from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { RazorpayWebView } from '@/components/checkout/RazorpayWebView';
import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import type { FoodOrdering } from '@/hooks/useFoodOrdering';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { FoodCheckoutForm } from './food-checkout/FoodCheckoutForm';
import { useFoodCheckoutForm } from './food-checkout/useFoodCheckoutForm';
import { FoodCartLines } from './FoodCartLines';
import { FoodNotice } from './FoodNotice';
import { FoodTotals } from './FoodTotals';

interface Props {
  ordering: FoodOrdering;
  currency: string;
  discountPct: number;
}

/**
 * The cart: each dish with its stepper and a remove, the bill, then who the
 * order is for — and Pay, which opens the venue's payment sheet over this one.
 * A closed or declined payment lands back here with the cart intact. Tamagui
 * twin of mWeb's food/FoodCartSheet.
 */
export function FoodCartSheet({ ordering, currency, discountPct }: Readonly<Props>) {
  const { t } = useTranslation();
  const { cart, checkout } = ordering;
  const { price } = cart;
  const { submitting, error } = checkout;
  const form = useFoodCheckoutForm(ordering.guest);

  const pay = form.handleSubmit((values) => ordering.pay(values));

  return (
    <DuncitDialog
      open={ordering.sheetOpen}
      // Closing mid-payment would hide the only place its outcome is shown.
      onClose={submitting ? () => undefined : ordering.closeSheet}
      testID="food-cart-sheet"
      title={t('mweb.venueFood.cart.title')}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={!submitting}
      footer={
        <DuncitButton
          testID="food-cart-pay"
          label={t('mweb.venueFood.checkout.pay', {
            vars: { total: formatFoodMoney(price.total, currency) },
          })}
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting || price.belowMinimum}
          onPress={() => fireAndForget(pay())}
        />
      }
    >
      <YStack gap={16}>
        <FoodCartLines cart={cart} currency={currency} disabled={submitting} />
        <FoodTotals
          subtotal={price.subtotal}
          discount={price.discount}
          discountPct={discountPct}
          total={price.total}
          currency={currency}
          testID="food-cart-totals"
        />
        {price.belowMinimum ? (
          <NoticeCard
            testID="food-cart-below-minimum"
            tone="info"
            title={t('mweb.venueFood.cart.belowMinimum')}
          />
        ) : null}
        <YStack height={1} backgroundColor="$borderColor" />
        <FoodCheckoutForm control={form.control} disabled={submitting} />
        {error ? (
          <FoodNotice
            testID="food-cart-error"
            tone="danger"
            title={error.title ?? error.message}
            body={error.title ? error.message : undefined}
            onDismiss={checkout.clearError}
          />
        ) : null}
      </YStack>
      <RazorpayWebView {...checkout.gateway} />
    </DuncitDialog>
  );
}
