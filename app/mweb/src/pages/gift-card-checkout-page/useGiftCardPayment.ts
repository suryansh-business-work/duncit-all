import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import type { RazorpayErrorLike } from '@duncit/utils';
import {
  CHECKOUT_ME,
  PUBLIC_FINANCE,
  VERIFY_RAZORPAY_PAYMENT,
  type CheckoutPaymentRow,
} from '../checkout-page/queries';
import {
  openRazorpayCheckout,
  type RazorpayOrderData,
  type RazorpaySignature,
} from '../checkout-page/razorpayCheckout';
import { parseApiError } from '../../utils/parseApiError';
import { useTranslation } from '../../i18n/useTranslation';
import type { GiftCardSelection } from '../gift-cards-page/queries';
import { CREATE_RAZORPAY_GIFT_CARD_ORDER, DUMMY_GIFT_CARD_CHECKOUT } from './queries';

interface Args {
  /** Told what Razorpay said, so the page can explain it and open a ticket. */
  onPaymentFailure: (error: RazorpayErrorLike | null) => void;
}

/**
 * The pay handler for the gift card checkout. Razorpay is the live gateway
 * when configured (create order → hosted sheet → shared verify); the dummy
 * gateway is the local fallback. Charged at face value — no coupons, coins or
 * fees, which is why this never touches the checkout session's extras.
 */
export function useGiftCardPayment({ onPaymentFailure }: Readonly<Args>) {
  const { t } = useTranslation();
  const { data: financeData, loading: financeLoading } = useQuery(PUBLIC_FINANCE);
  const { data: meData, loading: meLoading } = useQuery(CHECKOUT_ME, { fetchPolicy: 'cache-and-network' });
  const [doDummy] = useMutation(DUMMY_GIFT_CARD_CHECKOUT);
  const [doOrder] = useMutation(CREATE_RAZORPAY_GIFT_CARD_ORDER);
  const [doVerify] = useMutation(VERIFY_RAZORPAY_PAYMENT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckoutPaymentRow | null>(null);

  const finance = financeData?.publicFinanceSettings;
  const me = meData?.me;

  const verifyRazorpay = async (paymentDocId: string, sig: RazorpaySignature) => {
    setSubmitting(true);
    try {
      const res = await doVerify({ variables: { input: { payment_doc_id: paymentDocId, ...sig } } });
      const payment = res.data?.verifyRazorpayPayment;
      if (payment?.status === 'SUCCESS') setSuccess(payment);
      else setError(t('mweb.checkout.errorNotVerified'));
    } catch (verifyError) {
      setError(parseApiError(verifyError));
    } finally {
      setSubmitting(false);
    }
  };

  const pay = async (selection: GiftCardSelection) => {
    setError(null);
    setSubmitting(true);
    const input = {
      scope_type: selection.scope_type,
      scope_category_id: selection.scope_category_id,
      amount: selection.amount,
      recipient_email: selection.gift ? selection.recipient_email : null,
      recipient_name: selection.gift ? selection.recipient_name : null,
      message: selection.gift ? selection.message : null,
      contact_name: [me?.first_name, me?.last_name].filter(Boolean).join(' ').trim(),
      contact_email: me?.email ?? '',
      contact_phone_extension: me?.phone_extension ?? '',
      contact_phone_number: me?.phone_number ?? '',
      checkout_url: globalThis.window.location.href,
    };
    try {
      if (finance?.razorpay_enabled) {
        const orderRes = await doOrder({ variables: { input } });
        const order = orderRes.data?.createRazorpayGiftCardOrder;
        if (!order) {
          setError(t('mweb.checkout.errorStart'));
          return;
        }
        setSubmitting(false);
        await openRazorpayCheckout(order as RazorpayOrderData, {
          onSuccess: (sig: RazorpaySignature) => verifyRazorpay(order.payment_doc_id, sig),
          onFailure: onPaymentFailure,
        });
        return;
      }
      if (finance?.dummy_mode) {
        const res = await doDummy({ variables: { input: { ...input, simulate_failure: false } } });
        const payment = res.data?.dummyGiftCardCheckout;
        if (payment?.status === 'SUCCESS') setSuccess(payment);
        else setError(t('mweb.checkout.errorFailed'));
        return;
      }
      setError(t('mweb.checkout.errorNotConfigured'));
    } catch (submitError) {
      setError(parseApiError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return { finance, financeLoading, me, meLoading, submitting, error, setError, success, pay };
}
