import { useQuery } from '@apollo/client/react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Alert, Box, Card, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import { giftCardPurchaseTotals } from '@duncit/forms/schemas';
import PageHeader from '../../components/PageHeader';
import GatewayChip from '../checkout-page/GatewayChip';
import ProcessingBackdrop from '../checkout-page/ProcessingBackdrop';
import { PUBLIC_FINANCE, type CheckoutContact } from '../checkout-page/queries';
import CheckoutContactFields from '../checkout-page/CheckoutContactFields';
import { CHECKOUT_FIELD_SX } from '../checkout-page/checkoutFieldSx';
import { PaymentFailureDialog, usePaymentFailure } from '../../components/payment-failure';
import { CheckoutRequirementsCard, useCheckoutEligibility } from '../../components/checkout-gate';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardVisual from '../gift-cards-page/GiftCardVisual';
import OrderTotalCard from '../gift-cards-page/OrderTotalCard';
import type { GiftCardSelection } from '../gift-cards-page/queries';
import GiftCardSuccessCard from './GiftCardSuccessCard';
import DeliveryAddressCard, { useDeliveryAddressForm } from './DeliveryAddressCard';
import { useGiftCardPayment } from './useGiftCardPayment';

/** The gift card's own checkout — every card at face value, plus the delivery fee
 * once on a printed order; no coupons or coins. Contact comes from the profile;
 * the cards are created only on payment success. */
export default function GiftCardCheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const selection = (location.state as GiftCardSelection | null) ?? null;
  const { data: financeData } = useQuery<any>(PUBLIC_FINANCE);
  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';
  const totals = giftCardPurchaseTotals(
    {
      amount: String(selection?.amount ?? 0),
      quantity: String(selection?.quantity ?? 1),
      delivery_mode: selection?.delivery_mode ?? 'DIGITAL',
    },
    selection?.shipping_fee ?? 0
  );
  // What an agent needs if a payment times out and a ticket has to be opened.
  const failure = usePaymentFailure(() => ({
    description: t('mweb.giftCards.checkoutTitle'),
    amount: totals.total,
    currencySymbol,
  }));
  const payment = useGiftCardPayment({ onPaymentFailure: failure.report });
  const deliveryForm = useDeliveryAddressForm(payment.me);
  // Same three account facts the server checks before it will take money.
  // Must sit with the other hooks: the early returns below would otherwise
  // skip it and change the hook order between renders.
  const eligibility = useCheckoutEligibility();

  // Reached directly (refresh, pasted URL) — there is nothing to charge yet.
  if (!selection?.design_id) return <Navigate to="/gift-cards" replace />;
  const printed = selection.delivery_mode === 'PHYSICAL';
  if (payment.success) {
    return (
      <GiftCardSuccessCard
        payment={payment.success}
        gift={selection.gift}
        recipientEmail={selection.recipient_email}
        printed={printed}
      />
    );
  }

  const { me, billingForm } = payment;
  const contact: CheckoutContact | null = me
    ? {
        fullName: [me.first_name, me.last_name].filter(Boolean).join(' ').trim(),
        email: me.email ?? '',
        phoneExtension: me.phone_extension ?? '',
        phoneNumber: me.phone_number ?? '',
      }
    : null;
  const forWhom = printed
    ? t('mweb.giftCards.checkoutPrinted')
    : selection.recipient_email || t('mweb.giftCards.checkoutSelf');

  // A printed order needs a courier-ready address before the billing form submits.
  const onPay = billingForm.handleSubmit(async (values) => {
    if (printed && !(await deliveryForm.trigger())) return;
    await payment.pay(selection, values, printed ? deliveryForm.getValues() : null);
  });

  return (
    <Box data-testid="gift-card-checkout-screen" sx={{ maxWidth: 560, mx: 'auto', py: 0.5 }}>
      <Stack spacing={2}>
        <PageHeader
          testId="gift-card-checkout-header"
          title={t('mweb.giftCards.checkoutTitle')}
          onBack={() => navigate(-1)}
          right={<GatewayChip finance={payment.finance} />}
        />
        <GiftCardVisual
          scopeType="SHOP"
          scopeCategoryId={null}
          scopeName=""
          designName={selection.design_name}
          scopeImageUrl={selection.front_url}
          artworkFrontUrl={selection.front_url}
          artworkBackUrl={selection.back_url}
          amount={selection.amount}
          currencySymbol={currencySymbol}
        />
        <Typography data-testid="gift-card-checkout-recipient" variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.giftCards.checkoutFor', { vars: { who: forWhom } })}
        </Typography>
        <OrderTotalCard totals={totals} currencySymbol={currencySymbol} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {printed ? t('mweb.giftCards.checkoutNotePrinted') : t('mweb.giftCards.checkoutNote')}
        </Typography>
        {printed && <DeliveryAddressCard control={deliveryForm.control} />}
        <Card sx={{ p: 2 }}>
          {/* Contact (read-only) + the billing address and GST every invoice needs. */}
          <CheckoutContactFields
            control={billingForm.control}
            fieldSx={CHECKOUT_FIELD_SX}
            mainAddress={billingForm.mainAddress}
            hasMainAddress={billingForm.hasMainAddress}
            contact={contact}
            contactLoading={payment.meLoading && !me}
            addressRequired
          />
        </Card>
        {payment.error && (
          <Alert data-testid="gift-card-checkout-error" severity="error" onClose={() => payment.setError(null)}>
            {payment.error}
          </Alert>
        )}
        <CheckoutRequirementsCard missing={eligibility.missing} />
        <DuncitButton
          data-testid="gift-card-checkout-pay"
          variant="contained"
          size="large"
          fullWidth
          disabled={payment.submitting || payment.financeLoading || !me?.email || eligibility.missing.length > 0}
          onClick={onPay}
        >
          {t('mweb.giftCards.payCta', { vars: { amount: formatMoney(totals.total, { symbol: currencySymbol }) } })}
        </DuncitButton>
      </Stack>
      <PaymentFailureDialog
        failure={failure.failure}
        ticketNo={failure.ticketNo}
        ticketPending={failure.ticketPending}
        ticketFailed={failure.ticketFailed}
        onClose={failure.dismiss}
        onRetry={() => {
          failure.dismiss();
          payment.setError(null);
        }}
      />
      <ProcessingBackdrop open={payment.submitting} />
    </Box>
  );
}
