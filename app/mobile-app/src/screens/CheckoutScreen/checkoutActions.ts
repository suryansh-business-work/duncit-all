import type { CheckoutFormValues } from '@/forms/checkout';
import type { RazorpaySignature } from '@/hooks/useCheckout';
import { toErrorMessage } from '@/utils/errors';

import type { CheckoutState } from './useCheckoutState';

/** Coupon, Razorpay-verify and pay handlers over the pod checkout state. */
export function checkoutActions(s: CheckoutState) {
  const { t, checkout, order, setOrder, setSubmitting, setError, setPayment } = s;

  const applyCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? s.couponCode).trim();
    if (!code) return;
    s.setApplyingCoupon(true);
    s.setCouponError(null);
    try {
      // Priced on the post-tier ticket money, exactly as the server evaluates it.
      const preview = await checkout.previewCoupon(code, s.ticket.net);
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
      if (result?.status === 'SUCCESS') setPayment(result);
      else setError(t('mweb.checkout.errorNotVerified'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorNotVerified')));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (values: CheckoutFormValues) => {
    const { amount, appliedCode, coins } = s;
    setSubmitting(true);
    setError(null);
    try {
      if (s.razorpayEnabled) {
        const created = await checkout.createRazorpayOrder(
          values,
          amount,
          appliedCode,
          coins.applied,
        );
        // 100%-off coupon → completed server-side, skip the gateway sheet.
        if (created.free && created.payment) setPayment(created.payment);
        else setOrder(created);
        return;
      }
      if (s.dummyMode) {
        const result = await checkout.pay(values, amount, appliedCode, coins.applied);
        if (result?.status === 'SUCCESS') setPayment(result);
        else setError(t('mweb.checkout.errorFailed'));
        return;
      }
      setError(t('mweb.checkout.errorNotConfigured'));
    } catch (e) {
      // Parsed once, logged once: the structured issue feeds the Tech portal's
      // Error Logs section and renders with a Report button above the form.
      const issue = s.serverIssue.capture(e, s.payOperation);
      if (issue.code === 'ALREADY_BOOKED') {
        s.serverIssue.clear();
        s.setAlreadyBookedOpen(true);
      }
      setError(null);
    } finally {
      setSubmitting(false);
    }
  };

  return { applyCoupon, removeCoupon, finishVerify, submit };
}

export type CheckoutActions = ReturnType<typeof checkoutActions>;
