import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useWatch } from 'react-hook-form';
import { Box, Skeleton, Stack } from '@mui/material';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { useCart } from '../../components/cart/CartContext';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
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
      <EmptyState
        icon={<ShoppingBagOutlinedIcon />}
        title={t('mweb.checkout.nothingToCheckout')}
        actionLabel={t('mweb.checkout.backToCart')}
        onAction={() => navigate('/cart')}
      />
    );
  }
  if (session.financeLoading || !breakup) return <ProductCheckoutSkeleton />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 0.5 }}>
      <Stack spacing={2}>
        <PageHeader
          title={t('mweb.checkout.productTitle')}
          onBack={() => navigate(-1)}
          right={<GatewayChip finance={session.finance} />}
        />
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
      </Stack>
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

function ProductCheckoutSkeleton() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 0.5 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={40} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Skeleton variant="rounded" height={260} sx={{ flex: 1, borderRadius: '24px' }} />
          <Skeleton variant="rounded" height={420} sx={{ flex: 1, borderRadius: '24px' }} />
        </Stack>
      </Stack>
    </Box>
  );
}
