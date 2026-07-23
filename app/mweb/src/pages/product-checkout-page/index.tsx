import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { Box, Button, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { alpha, useTheme } from '@mui/material/styles';
import { useCart } from '../../components/cart/CartContext';
import { buildBreakup } from '../checkout-page/checkoutMath';
import CheckoutSuccess from '../checkout-page/CheckoutSuccess';
import GatewayChip from '../checkout-page/GatewayChip';
import PaymentDetailsCard from '../checkout-page/PaymentDetailsCard';
import ProcessingBackdrop from '../checkout-page/ProcessingBackdrop';
import SavedAddressPicker from '../checkout-page/SavedAddressPicker';
import { useCheckoutSession } from '../checkout-page/useCheckoutSession';
import type { CheckoutState } from '../checkout-page/queries';
import ProductOrderSummaryCard from './ProductOrderSummaryCard';
import { mapLinesToItems, productSubtotal } from './productCheckoutInput';
import { useProductPayment } from './useProductPayment';
import { useProductShippingQuote } from './useProductShippingQuote';

export default function ProductCheckoutPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { podId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as CheckoutState;
  const { lines: allLines, clearPod } = useCart();

  const lines = useMemo(() => allLines.filter((line) => line.pod_id === podId), [allLines, podId]);
  const podTitle = lines[0]?.pod_title || state.pod_title || 'Your order';
  const items = useMemo(() => mapLinesToItems(lines), [lines]);
  const subtotal = useMemo(() => productSubtotal(lines), [lines]);

  const session = useCheckoutSession({
    couponPodId: podId || null,
    onBeforeSuccess: () => clearPod(podId),
  });
  const deliveryPincode = useWatch({ control: session.control, name: 'pincode' }) || '';
  const { quote, loading: shippingLoading, pincodeValid } = useProductShippingQuote(items, deliveryPincode);

  const shippingTotal = quote?.total ?? 0;
  const amount = subtotal + shippingTotal;
  const breakup = useMemo(() => buildBreakup(amount, session.finance), [amount, session.finance]);

  const onCheckout = useProductPayment({ session, items, podTitle });
  const submit = session.handleSubmit(onCheckout);

  if (session.success) {
    return (
      <CheckoutSuccess
        payment={session.success}
        onHome={() => navigate('/')}
        onProfile={() => navigate('/orders')}
        profileLabel="My Orders"
      />
    );
  }

  if (lines.length === 0) return <EmptyProductCheckout onCart={() => navigate('/cart')} />;
  if (session.financeLoading || !breakup) return <ProductCheckoutSkeleton />;

  const headerBg = isDark
    ? 'linear-gradient(145deg, #15111c 0%, #2a1926 58%, #111827 100%)'
    : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 58%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 24px)' }}>
      <Box sx={{ p: 2, borderRadius: 4, color: 'text.primary', background: headerBg, boxShadow: isDark ? '0 18px 44px rgba(17, 24, 39, 0.22)' : `0 18px 44px ${alpha(theme.palette.primary.dark, 0.12)}`, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ color: 'text.primary', bgcolor: isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.18)' : alpha(theme.palette.primary.main, 0.16) } }}><ArrowBackIcon /></IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>Product checkout</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>Complete your order</Typography>
          </Box>
          <GatewayChip finance={session.finance} />
        </Stack>
        <SavedAddressPicker onPick={session.pickAddress} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <ProductOrderSummaryCard
            podTitle={podTitle}
            lines={lines}
            breakup={breakup}
            subtotal={subtotal}
            quote={quote}
            shippingLoading={shippingLoading}
            pincodeValid={pincodeValid}
          />
          <PaymentDetailsCard
            control={session.control}
            onSubmit={submit}
            error={session.error}
            submitting={session.submitting}
            total={breakup.total}
            effectiveTotal={session.coupon?.ok ? session.coupon.final_total : breakup.total}
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
          />
        </Stack>
      </Box>
      <ProcessingBackdrop open={session.submitting} />
    </Box>
  );
}

function EmptyProductCheckout({ onCart }: Readonly<{ onCart: () => void }>) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
      <ShoppingBagIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
      <Typography variant="h6" fontWeight={900}>Nothing to checkout</Typography>
      <Typography variant="body2" color="text.secondary">This pod has no products in your cart.</Typography>
      <Button variant="contained" onClick={onCart} sx={{ borderRadius: 999, fontWeight: 800 }}>Back to cart</Button>
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
