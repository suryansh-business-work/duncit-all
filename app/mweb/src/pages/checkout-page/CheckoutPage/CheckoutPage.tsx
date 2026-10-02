import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { toCheckoutContact, toCheckoutBilling } from '../checkout';
import CheckoutSuccess from '../CheckoutSuccess';
import {
  CHECKOUT_POD,
  CREATE_RAZORPAY_ORDER,
  DUMMY_CHECKOUT,
  type CheckoutForm,
  type CheckoutState,
} from '../queries';
import {
  openRazorpayCheckout,
  type RazorpayOrderData,
  type RazorpaySignature,
} from '../razorpayCheckout';
import { usePaymentFailure } from '../../../components/payment-failure';
import { useServerIssue } from '../../../components/issue-notice';
import { useTranslation } from '../../../i18n/useTranslation';
import { useCheckoutSession } from '../useCheckoutSession';
import { usePodCheckoutBill } from '../usePodCheckoutBill';
import { CheckoutSkeleton, EmptyCheckout } from './CheckoutFallbacks';
import CheckoutView from './CheckoutView';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { podId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as CheckoutState;
  const search = new URLSearchParams(location.search);
  const checkoutPodId = podId || state.pod_id || search.get('pod_id') || '';

  const { data: podData, loading: podLoading, error: podError } = useQuery<any>(CHECKOUT_POD, {
    variables: { id: checkoutPodId },
    skip: !checkoutPodId,
    fetchPolicy: 'cache-and-network',
  });
  const [doCheckout] = useMutation<any>(DUMMY_CHECKOUT);
  const [doRazorpayOrder] = useMutation<any>(CREATE_RAZORPAY_ORDER);
  const [alreadyBookedOpen, setAlreadyBookedOpen] = useState(false);

  const session = useCheckoutSession({ couponPodId: checkoutPodId || null });

  const pod = podData?.pod;
  // Pod checkout pays the membership (pod_amount) ONLY — products are a separate
  // payment through the standalone product checkout. Never mix the two.
  // Seats ride in from Pod Details. The ticket price multiplies; the server
  // re-prices and re-checks capacity, so this is a preview, never the charge.
  const seats = Math.max(1, Number(state.seats ?? search.get('seats') ?? 1) || 1);
  const linkTotal = Number(state.amount ?? search.get('amount') ?? 0);
  // Ticket gross → multi-ticket tier → coupon → coins → GST, the server's order.
  const { unitAmount, amount, base, breakup, coins, payBreakup, coinSummary, discounts } =
    usePodCheckoutBill({ session, pod, seats, linkTotal });
  // Server-operation failures, parsed + logged once by the shared error module.
  const serverIssue = useServerIssue('/checkout');
  // What an agent needs if a payment times out and a ticket has to be opened.
  const payment = usePaymentFailure(() => ({
    description: pod?.pod_title ? `Pod: ${pod.pod_title}` : 'Pod checkout',
    amount: breakup?.total ?? amount,
    currencySymbol: breakup?.currency,
  }));

  // Razorpay: create the order, settle a free one outright, otherwise hand the
  // buyer to the hosted sheet and verify on its callback.
  const payWithRazorpay = async (input: Record<string, unknown>) => {
    const orderRes = await doRazorpayOrder({ variables: { input } });
    const order = orderRes.data?.createRazorpayOrder;
    if (!order) {
      session.setError(t('mweb.checkout.errorStart'));
      return;
    }
    if (order.free && order.payment) {
      session.finishSuccess(order.payment);
      return;
    }
    session.setSubmitting(false);
    await openRazorpayCheckout(order as RazorpayOrderData, {
      onSuccess: (sig: RazorpaySignature) => session.verifyRazorpay(order.payment_doc_id, sig),
      // Every failure used to be reported as the buyer's own cancellation.
      onFailure: (error) => { payment.report(error).catch(() => undefined); },
    });
  };

  // Dummy gateway: one round trip that either pays or fails outright.
  const payWithDummy = async (input: Record<string, unknown>, simulate_failure: boolean) => {
    const res = await doCheckout({ variables: { input: { ...input, simulate_failure } } });
    const paid = res.data?.dummyCheckout;
    if (paid?.status === 'SUCCESS') session.finishSuccess(paid);
    else session.setError(t('mweb.checkout.errorFailed'));
  };

  const onCheckout = async (values: CheckoutForm) => {
    session.setError(null);
    session.setSubmitting(true);
    const finance = session.finance;
    const title = pod?.pod_title || state.pod_title || search.get('title') || 'Booking';
    const { simulate_failure, ...contact } = toCheckoutContact(values);
    const billing = toCheckoutBilling(values, session.me?.address);
    const input = {
      pod_id: checkoutPodId || null,
      amount,
      seats,
      description: state.description || `Pod booking · ${title}`,
      ...contact,
      billing,
      checkout_url: globalThis.window.location.href,
      coupon_code: session.coupon?.ok ? session.coupon.code : null,
      redeem_coins: coins.applied,
    };
    await session.persistMainAddress(values);
    try {
      if (finance?.razorpay_enabled) {
        await payWithRazorpay(input);
        return;
      }
      if (finance?.dummy_mode) {
        await payWithDummy(input, simulate_failure);
        return;
      }
      session.setError(t('mweb.checkout.errorNotConfigured'));
    } catch (submitError: any) {
      // Parsed once, logged once: the structured issue feeds the Tech portal's
      // Error Logs section and renders with a Report button below.
      const issue = serverIssue.capture(
        submitError,
        finance?.razorpay_enabled ? 'createRazorpayOrder' : 'dummyCheckout'
      );
      if (issue.code === 'ALREADY_BOOKED') {
        serverIssue.clear();
        setAlreadyBookedOpen(true);
      }
    } finally {
      session.setSubmitting(false);
    }
  };

  const submit = session.handleSubmit(onCheckout);

  if (session.success) {
    return (
      <CheckoutSuccess
        payment={session.success}
        pod={pod}
        onHome={() => navigate('/')}
        onProfile={() => navigate('/profile')}
      />
    );
  }

  if (!checkoutPodId && !state.amount) {
    return (
      <EmptyCheckout
        onHome={() => navigate('/')}
        title={t('mweb.checkout.nothingToCheckout')}
        action={t('mweb.checkout.backToHome')}
      />
    );
  }
  if (session.financeLoading || podLoading || !breakup) return <CheckoutSkeleton />;

  return (
    <CheckoutView
      session={session}
      pod={pod}
      podError={podError}
      serverIssue={serverIssue}
      stateTitle={state.pod_title || search.get('title') || ''}
      bill={{ unitAmount, base, coins, payBreakup, coinSummary, discounts }}
      breakup={breakup}
      seats={seats}
      submit={submit}
      payment={payment}
      alreadyBookedOpen={alreadyBookedOpen}
      onCloseAlreadyBooked={() => setAlreadyBookedOpen(false)}
    />
  );
}
