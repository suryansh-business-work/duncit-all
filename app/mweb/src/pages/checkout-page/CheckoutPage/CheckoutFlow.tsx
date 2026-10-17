import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { toCheckoutContact, toCheckoutBilling } from '../checkout';
import CheckoutSuccess from '../CheckoutSuccess';
import { CREATE_RAZORPAY_ORDER, DUMMY_CHECKOUT, type CheckoutForm, type CheckoutPaymentRow } from '../queries';
import {
  openRazorpayCheckout,
  type RazorpayOrderData,
  type RazorpaySignature,
} from '../razorpayCheckout';
import { usePaymentFailure } from '../../../components/payment-failure';
import { useServerIssue } from '../../../components/issue-notice';
import { useTranslation } from '../../../i18n/useTranslation';
import type { usePodCheckoutBill } from '../usePodCheckoutBill';
import { CheckoutSkeleton, EmptyCheckout } from './CheckoutFallbacks';
import CheckoutView from './CheckoutView';
import type { CheckoutContext } from './useCheckoutContext';

type Bill = ReturnType<typeof usePodCheckoutBill> & { dates?: number };

/** What createRazorpayOrder answers: the sheet's data, or a booking already paid in full. */
type CreatedOrder = RazorpayOrderData & { free: boolean; payment: CheckoutPaymentRow | null };

interface Props {
  ctx: CheckoutContext;
  bill: Bill;
  /** The bill is still being priced (a server quote in flight). */
  billLoading?: boolean;
}

/**
 * A pod checkout once its bill is priced: the pay handlers, the success page
 * and the view. The bill is the caller's — one date priced locally
 * (`usePodCheckoutBill`), or several dates of a recurring pod priced by the
 * server (`useRecurringCheckoutBill`) — and this flow is the same for both.
 */
export default function CheckoutFlow({ ctx, bill, billLoading = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, search, checkoutPodId, dateIds, pod, podLoading, podError, session, rentals, seats } = ctx;
  const [doCheckout] = useMutation<{ dummyCheckout: CheckoutPaymentRow | null }>(DUMMY_CHECKOUT);
  const [doRazorpayOrder] = useMutation<{ createRazorpayOrder: CreatedOrder | null }>(CREATE_RAZORPAY_ORDER);
  const [alreadyBookedOpen, setAlreadyBookedOpen] = useState(false);
  const { unitAmount, amount, base, breakup, coins, payBreakup, coinSummary, discounts } = bill;
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
    await openRazorpayCheckout(order, {
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
    if (rentals.blocked) {
      session.setError(t('venueRentals.guest.agreeRequired'));
      return;
    }
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
      selected_rentals: rentals.selections,
      // A recurring pod's dates, each paid for on its own under one order.
      ...(dateIds.length > 0 ? { date_pod_ids: dateIds } : {}),
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
    } catch (submitError: unknown) {
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
  if (session.financeLoading || podLoading || billLoading || !breakup) return <CheckoutSkeleton />;

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
      dates={bill.dates}
      rentals={rentals}
      submit={submit}
      payment={payment}
      alreadyBookedOpen={alreadyBookedOpen}
      onCloseAlreadyBooked={() => setAlreadyBookedOpen(false)}
    />
  );
}
