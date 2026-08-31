import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { alpha, useTheme } from '@mui/material/styles';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { toCheckoutContact, toCheckoutBilling } from './checkout';
import { buildBreakup } from './checkoutMath';
import CheckoutSuccess from './CheckoutSuccess';
import GatewayChip from './GatewayChip';
import OrderSummaryCard, { type CheckoutDiscount } from './OrderSummaryCard';
import PaymentDetailsCard from './PaymentDetailsCard';
import ProcessingBackdrop from './ProcessingBackdrop';
import SavedAddressPicker from './SavedAddressPicker';
import {
  CHECKOUT_POD,
  CREATE_RAZORPAY_ORDER,
  DUMMY_CHECKOUT,
  type CheckoutForm,
  type CheckoutState,
} from './queries';
import {
  openRazorpayCheckout,
  type RazorpayOrderData,
  type RazorpaySignature,
} from './razorpayCheckout';
import { PaymentFailureDialog, usePaymentFailure } from '../../components/payment-failure';
import { IssueNotice, useServerIssue } from '../../components/issue-notice';
import { useTranslation } from '../../i18n/useTranslation';
import { useCheckoutSession } from './useCheckoutSession';
import { useCoinRedemption } from './useCoinRedemption';
import { applyBillDiscounts, coinCheckoutSummary } from '@duncit/utils';
import AlreadyBookedDialog from './AlreadyBookedDialog';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
  // The link carries the MULTIPLIED total — it always has — so dividing it by
  // the same seat count recovers the unit price. Reading it as a unit price and
  // multiplying again previewed a three-seat booking at nine times the ticket,
  // and the page still renders a working Pay button when the pod query fails,
  // so that fallback was reachable.
  const linkTotal = Number(state.amount ?? search.get('amount') ?? 0);
  const unitAmount = Number(pod?.pod_amount ?? 0) || linkTotal / seats;
  const amount = Math.round(unitAmount * seats * 100) / 100;
  const breakup = useMemo(() => buildBreakup(amount, session.finance), [amount, session.finance]);
  // The coupon discounts the whole pod bill, so coins redeem against its result.
  const coins = useCoinRedemption(session, session.coupon?.ok ? session.coupon.final_total : amount);
  // Server-operation failures, parsed + logged once by the shared error module.
  const serverIssue = useServerIssue('/checkout');
  // What is actually charged, broken up the same way. Coins and coupons cut the
  // GROSS, and the server re-quotes on what is left, so the tax owed drops with
  // it — reusing the undiscounted breakup here would print a GST nobody pays.
  const payBreakup = useMemo(
    () => buildBreakup(coins.effectiveTotal, session.finance),
    [coins.effectiveTotal, session.finance]
  );
  // The deductions, in the order they are taken. Coins are 1:1 with the rupee,
  // so the count applied IS the amount off.
  // Earned on what is ACTUALLY charged — the server credits on the total after
  // coins are spent, so previewing off the gross would promise coins that never
  // arrive.
  const coinSummary = useMemo(
    () =>
      coinCheckoutSummary({
        balance: session.coinBalance,
        applied: coins.applied,
        payable: coins.effectiveTotal,
        earnPct: session.coinEarnPct,
      }),
    [session.coinBalance, session.coinEarnPct, coins.applied, coins.effectiveTotal],
  );

  // Taken off the gross in order and stopped at zero, so a coupon (or a coupon
  // plus coins) worth more than the ticket prints only what it actually paid
  // for: the excess is dropped, never refunded and never a negative total.
  const discounts = useMemo(() => {
    const rows: CheckoutDiscount[] = [];
    if (session.coupon?.ok && session.coupon.discount_amount > 0) {
      rows.push({
        key: 'coupon',
        label: t('mweb.checkout.couponDiscount', { vars: { code: session.coupon.code ?? '' } }),
        amount: session.coupon.discount_amount,
      });
    }
    if (coins.applied > 0) {
      rows.push({ key: 'coins', label: t('mweb.coin.checkoutTitle'), amount: coins.applied });
    }
    return applyBillDiscounts(amount, rows).discounts;
  }, [session.coupon, coins.applied, amount, t]);
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

  const headerBg = isDark
    ? 'linear-gradient(145deg, #15111c 0%, #2a1926 58%, #111827 100%)'
    : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 58%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ p: 2, borderRadius: '16px', color: 'text.primary', background: headerBg, boxShadow: isDark ? '0 18px 44px rgba(17, 24, 39, 0.22)' : `0 18px 44px ${alpha(theme.palette.primary.dark, 0.12)}`, border: '1px solid', borderColor: 'divider' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 2
          }}>
          <DuncitIconButton onClick={() => navigate(-1)} aria-label={t('mweb.common.goBack')} sx={{ color: 'text.primary', bgcolor: isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.18)' : alpha(theme.palette.primary.main, 0.16) } }}><ArrowBackIcon /></DuncitIconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>{t('mweb.checkout.title')}</Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                lineHeight: 1.1
              }}>{t('mweb.checkout.heading')}</Typography>
          </Box>
          <GatewayChip finance={session.finance} />
        </Stack>
        {podError && <Alert severity="error" sx={{ mb: 2 }}>{podError.message}</Alert>}
        {serverIssue.issue && (
          <Box sx={{ mb: 2 }}>
            <IssueNotice issue={serverIssue.issue} page="/checkout" onClose={serverIssue.clear} />
          </Box>
        )}
        <SavedAddressPicker onPick={session.pickAddress} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <OrderSummaryCard pod={pod} stateTitle={state.pod_title || search.get('title') || ''} breakup={payBreakup ?? breakup} grossTotal={breakup.total} discounts={discounts} seats={seats} unitAmount={unitAmount} coins={coinSummary} />
          <PaymentDetailsCard
            control={session.control}
            onSubmit={submit}
            error={session.error}
            submitting={session.submitting}
            total={breakup.total}
            effectiveTotal={coins.effectiveTotal}
            currency={breakup.currency}
            dummyMode={!!session.finance?.dummy_mode && !session.finance?.razorpay_enabled}
            mainAddress={session.mainAddress}
            hasMainAddress={session.hasMainAddress}
            contact={session.meContact}
            contactLoading={session.meLoading && !session.me}
            coupon={session.coupon}
            couponCode={session.couponCode}
            setCouponCode={session.setCouponCode}
            couponError={session.couponError}
            applyingCoupon={session.applyingCoupon}
            availableCoupons={session.availableCoupons}
            onApplyCoupon={(code) => session.applyCoupon(amount, code)}
            onRemoveCoupon={session.removeCoupon}
            coins={coins}
          />
        </Stack>
      </Box>
      <PaymentFailureDialog
        failure={payment.failure}
        ticketNo={payment.ticketNo}
        ticketPending={payment.ticketPending}
        ticketFailed={payment.ticketFailed}
        onClose={payment.dismiss}
        onRetry={() => {
          payment.dismiss();
          session.setError(null);
        }}
      />
      <AlreadyBookedDialog
        open={alreadyBookedOpen}
        onClose={() => setAlreadyBookedOpen(false)}
        onHistory={() => navigate('/pod-history')}
      />
      <ProcessingBackdrop open={session.submitting} message={session.confirmingMessage} />
    </Box>
  );
}

function EmptyCheckout({ onHome, title, action }: Readonly<{ onHome: () => void; title: string; action: string }>) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="info" sx={{ mb: 2 }}>{title}</Alert>
      <DuncitButton onClick={onHome} variant="contained">{action}</DuncitButton>
    </Box>
  );
}

function CheckoutSkeleton() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={40} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Skeleton variant="rounded" height={260} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={420} sx={{ flex: 1 }} />
        </Stack>
      </Stack>
    </Box>
  );
}
