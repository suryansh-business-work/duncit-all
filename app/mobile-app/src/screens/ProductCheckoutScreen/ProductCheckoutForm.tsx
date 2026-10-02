import {
  CheckoutSavingsCard,
  ProductOrderSummary,
  SavedAddressPicker,
} from '@/components/checkout';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { formatMoney } from '@/utils/checkout-math';
import { CheckoutForm } from '@/forms/checkout';
import { buildCheckoutContact } from '@/hooks/useCheckout';

import type { ProductCheckoutActions } from './productCheckoutActions';
import type { ProductCheckoutState } from './useProductCheckoutState';

interface ProductCheckoutFormProps {
  s: ProductCheckoutState;
  actions: ProductCheckoutActions;
  breakup: NonNullable<ProductCheckoutState['breakup']>;
}

/** The priced checkout: saved address, order summary, savings and the form. */
export function ProductCheckoutForm({ s, actions, breakup }: Readonly<ProductCheckoutFormProps>) {
  const { t, checkout, coins } = s;
  const { me, isLoading } = checkout;
  return (
    <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <SavedAddressPicker onPick={s.setPickedAddress} />
      <ProductOrderSummary
        lines={s.lines}
        breakup={breakup}
        subtotal={s.subtotal}
        quote={s.quote}
        shippingLoading={s.shippingLoading}
        pincodeValid={s.pincodeValid}
        onInfo={s.setInfoProductId}
        coins={s.coinSummary}
      />
      <CheckoutSavingsCard
        code={s.couponCode}
        setCode={s.setCouponCode}
        applied={s.coupon}
        error={s.couponError}
        applying={s.applyingCoupon}
        currency={breakup.currency}
        available={checkout.availableCoupons}
        onApply={actions.applyCoupon}
        onRemove={actions.removeCoupon}
        coins={coins}
        originalTotal={breakup.total}
      />
      <CheckoutForm
        initialValues={s.formInitial}
        mainAddress={me?.address ?? null}
        contact={buildCheckoutContact(me)}
        contactLoading={isLoading && !me}
        loading={s.submitting}
        errorMessage={s.error}
        dummyMode={s.dummyMode}
        // The number goes ON the button — a cart summary has usually scrolled
        // away by the time the buyer reaches it.
        payLabel={t('mweb.checkout.pay', {
          vars: { amount: formatMoney(breakup.currency, coins.effectiveTotal) },
        })}
        addressRequired
        onPincodeChange={s.setDeliveryPincode}
        onSubmit={actions.submit}
      />
    </RefreshScrollView>
  );
}
