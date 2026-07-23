import { useMutation } from '@apollo/client';
import {
  CREATE_RAZORPAY_PRODUCT_ORDER,
  DUMMY_PRODUCT_CHECKOUT,
  type CheckoutForm,
  type ProductCartItemInput,
} from '../checkout-page/queries';
import {
  openRazorpayCheckout,
  type RazorpayOrderData,
  type RazorpaySignature,
} from '../checkout-page/razorpayCheckout';
import { parseApiError } from '../../utils/parseApiError';
import type { CheckoutSession } from '../checkout-page/useCheckoutSession';
import { buildProductCheckoutInput } from './productCheckoutInput';

interface Args {
  session: CheckoutSession;
  items: ProductCartItemInput[];
}

/**
 * The pay handler for the standalone product checkout. Razorpay is the live
 * gateway when configured (create order → hosted sheet → shared verify); the
 * dummy gateway is the local fallback. Never touches the pod-join engine.
 */
export function useProductPayment({ session, items }: Args) {
  const [doDummy] = useMutation(DUMMY_PRODUCT_CHECKOUT);
  const [doRazorpay] = useMutation(CREATE_RAZORPAY_PRODUCT_ORDER);

  return async (values: CheckoutForm) => {
    session.setError(null);
    session.setSubmitting(true);
    const finance = session.finance;
    const { input, simulate_failure } = buildProductCheckoutInput(values, {
      items,
      mainAddress: session.me?.address ?? null,
      couponCode: session.coupon?.ok ? session.coupon.code : null,
    });
    await session.persistMainAddress(values);
    try {
      if (finance?.razorpay_enabled) {
        const orderRes = await doRazorpay({ variables: { input } });
        const order = orderRes.data?.createRazorpayProductOrder;
        if (!order) {
          session.setError('Could not start the payment. Please try again.');
          return;
        }
        if (order.free && order.payment) {
          session.finishSuccess(order.payment);
          return;
        }
        session.setSubmitting(false);
        await openRazorpayCheckout(order as RazorpayOrderData, {
          onSuccess: (sig: RazorpaySignature) => session.verifyRazorpay(order.payment_doc_id, sig),
          onDismiss: () => session.setError('Payment was cancelled.'),
        });
        return;
      }
      if (finance?.dummy_mode) {
        const res = await doDummy({ variables: { input: { ...input, simulate_failure } } });
        const payment = res.data?.dummyProductCheckout;
        if (payment?.status === 'SUCCESS') session.finishSuccess(payment);
        else session.setError('Payment failed. Please try again.');
        return;
      }
      session.setError('Online payments are not configured yet. Please try again later.');
    } catch (submitError: any) {
      session.setError(parseApiError(submitError));
    } finally {
      session.setSubmitting(false);
    }
  };
}
