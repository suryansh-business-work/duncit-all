import type { CheckoutFormValues } from '@/forms/checkout';
import type { RazorpaySignature } from '@/hooks/useCheckout';
import type { ProductPayment } from '@/hooks/useProductCheckout';
import { toErrorMessage } from '@/utils/errors';

import type { ProductCheckoutState } from './useProductCheckoutState';

/** Coupon, Razorpay-verify and pay handlers over the checkout state. */
export function productCheckoutActions(s: ProductCheckoutState) {
  const { t, checkout, order, setOrder, setSubmitting, setError } = s;

  const finishSuccess = (result: NonNullable<ProductPayment>) => {
    s.clearAll();
    s.setPayment(result);
  };

  const applyCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? s.couponCode).trim();
    if (!code) return;
    s.setApplyingCoupon(true);
    s.setCouponError(null);
    try {
      // Coupons discount the product subtotal only — never the shipping charge.
      const preview = await checkout.previewCoupon(code, s.subtotal);
      if (preview?.ok) s.setCoupon(preview);
      else {
        s.setCoupon(null);
        s.setCouponError(preview?.message ?? t('mweb.checkout.errorCouponInvalid'));
      }
    } catch (e) {
      s.setCoupon(null);
      s.setCouponError(toErrorMessage(e, t('mweb.checkout.errorCouponApply')));
    } finally {
      s.setApplyingCoupon(false);
    }
  };
  const removeCoupon = () => {
    s.setCoupon(null);
    s.setCouponCode('');
    s.setCouponError(null);
  };

  const finishVerify = async (sig: RazorpaySignature) => {
    /* istanbul ignore next -- the Razorpay sheet only mounts when an order exists */
    if (!order) return;
    setOrder(null);
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkout.verifyRazorpay(order.payment_doc_id, sig);
      if (result?.status === 'SUCCESS') finishSuccess(result);
      else setError(t('mweb.checkout.errorNotVerified'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorNotVerified')));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      if (s.razorpayEnabled) {
        const created = await checkout.createRazorpayProductOrder(values, s.payContext);
        if (created.free && created.payment) finishSuccess(created.payment);
        else setOrder(created);
        return;
      }
      if (s.dummyMode) {
        const result = await checkout.payProduct(values, s.payContext);
        if (result?.status === 'SUCCESS') finishSuccess(result);
        else setError(t('mweb.checkout.errorFailed'));
        return;
      }
      setError(t('mweb.checkout.errorNotConfigured'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return { applyCoupon, removeCoupon, finishVerify, submit };
}

export type ProductCheckoutActions = ReturnType<typeof productCheckoutActions>;
