import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useWatch } from 'react-hook-form';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { alpha, useTheme } from '@mui/material/styles';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useCart } from '../../components/cart/CartContext';
import { buildBreakup } from '../checkout-page/checkoutMath';
import CheckoutSuccess from '../checkout-page/CheckoutSuccess';
import GatewayChip from '../checkout-page/GatewayChip';
import PaymentDetailsCard from '../checkout-page/PaymentDetailsCard';
import ProcessingBackdrop from '../checkout-page/ProcessingBackdrop';
import SavedAddressPicker from '../checkout-page/SavedAddressPicker';
import ProductDetailDialog from '../pod-details-page/ProductDetailDialog';
import { useCheckoutSession } from '../checkout-page/useCheckoutSession';
import { useCoinRedemption } from '../checkout-page/useCoinRedemption';
import { coinCheckoutSummary } from '@duncit/utils';
import ProductOrderSummaryCard from './ProductOrderSummaryCard';
import { mapLinesToItems, productSubtotal } from './productCheckoutInput';
import { PaymentFailureDialog, usePaymentFailure } from '../../components/payment-failure';
import { useTranslation } from '../../i18n/useTranslation';
import { useProductPayment } from './useProductPayment';
import { useProductShippingQuote } from './useProductShippingQuote';

/** The combined product checkout — EVERY cart line (across pods) pays in ONE
 * payment with one Pay button; delivery is listed per warehouse group. */
export default function ProductCheckoutPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { lines, clearAll } = useCart();

  const items = useMemo(() => mapLinesToItems(lines), [lines]);
  const subtotal = useMemo(() => productSubtotal(lines), [lines]);

  const session = useCheckoutSession({
    couponPodId: null,
    onBeforeSuccess: () => clearAll(),
    // Products are shipped — the delivery address stays mandatory here.
    requireAddress: true,
  });
  // The delivery quote follows the chosen saved address (its pincode); until one
  // is picked it falls back to the pincode typed into the billing form.
  const [pickedPincode, setPickedPincode] = useState('');
  const [infoProductId, setInfoProductId] = useState<string | null>(null);
  const formPincode = useWatch({ control: session.control, name: 'pincode' }) || '';
  const deliveryPincode = pickedPincode || formPincode;
  const { quote, loading: shippingLoading, pincodeValid } = useProductShippingQuote(items, deliveryPincode);

  const shippingTotal = quote?.total ?? 0;
  const amount = subtotal + shippingTotal;
  const breakup = useMemo(() => buildBreakup(amount, session.finance), [amount, session.finance]);
  // The server discounts the PRODUCT SUBTOTAL only and adds shipping on top —
  // preview against the subtotal and pay discounted subtotal + delivery. Coins
  // then redeem against that bill.
  const payableAfterCoupon = session.coupon?.ok ? session.coupon.final_total + shippingTotal : amount;
  const coins = useCoinRedemption(session, payableAfterCoupon);
  // A shop order earns at its OWN rate — a physical product carries a cost of
  // goods a pod seat does not, so the two rates are configured separately.
  const coinSummary = coinCheckoutSummary({
    balance: session.coinBalance,
    applied: coins.applied,
    payable: coins.effectiveTotal,
    earnPct: session.coinShopEarnPct,
  });

  // What an agent needs if a payment times out and a ticket has to be opened.
  const payment = usePaymentFailure(() => ({
    description: `Products (${items.length} line${items.length === 1 ? '' : 's'})`,
    amount: breakup?.total ?? amount,
    currencySymbol: breakup?.currency,
  }));
  const onCheckout = useProductPayment({ session, items, coins, onPaymentFailure: payment.report });
  const submit = session.handleSubmit(onCheckout);

  if (session.success) {
    return (
      <CheckoutSuccess
        payment={session.success}
        onHome={() => navigate('/')}
        onProfile={() => navigate('/orders')}
        profileLabel={t('mweb.checkout.myOrders')}
      />
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyProductCheckout
        onCart={() => navigate('/cart')}
        title={t('mweb.checkout.nothingToCheckout')}
        body={t('mweb.checkout.noProductsInCart')}
        action={t('mweb.checkout.backToCart')}
      />
    );
  }
  if (session.financeLoading || !breakup) return <ProductCheckoutSkeleton />;

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
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>{t('mweb.checkout.productTitle')}</Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                lineHeight: 1.1
              }}>{t('mweb.checkout.productHeading')}</Typography>
          </Box>
          <GatewayChip finance={session.finance} />
        </Stack>
        <SavedAddressPicker
          onPick={(address) => {
            session.pickAddress(address);
            setPickedPincode(address.pincode);
          }}
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <ProductOrderSummaryCard
            lines={lines}
            breakup={breakup}
            subtotal={subtotal}
            quote={quote}
            shippingLoading={shippingLoading}
            pincodeValid={pincodeValid}
            onInfo={setInfoProductId}
            coins={coinSummary}
          />
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
            onApplyCoupon={(code) => session.applyCoupon(subtotal, code)}
            onRemoveCoupon={session.removeCoupon}
            coins={coins}
            addressRequired
          />
        </Stack>
      </Box>
      <ProductDetailDialog productId={infoProductId} onClose={() => setInfoProductId(null)} />
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
      <ProcessingBackdrop open={session.submitting} message={session.confirmingMessage} />
    </Box>
  );
}

function EmptyProductCheckout({
  onCart,
  title,
  body,
  action,
}: Readonly<{ onCart: () => void; title: string; body: string; action: string }>) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: "center",
        py: 8,
        textAlign: 'center'
      }}>
      <ShoppingBagIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
      <Typography variant="h6" sx={{
        fontWeight: 700
      }}>{title}</Typography>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>{body}</Typography>
      <DuncitButton variant="contained" onClick={onCart} sx={{ borderRadius: 999, fontWeight: 600 }}>{action}</DuncitButton>
    </Stack>
  );
}

function ProductCheckoutSkeleton() {
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
