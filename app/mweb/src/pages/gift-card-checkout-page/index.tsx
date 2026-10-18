import { useQuery } from '@apollo/client/react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Alert, Box, Card, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
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
import type { GiftCardSelection } from '../gift-cards-page/queries';
import GiftCardSuccessCard from './GiftCardSuccessCard';
import { useGiftCardPayment } from './useGiftCardPayment';

/** A summary row: label muted, value ink; the total row is 700 and ink. */
function SummaryRow({ label, value, bold = false, testId }: Readonly<{ label: string; value: string; bold?: boolean; testId: string }>) {
  const size = bold ? '1rem' : '0.875rem';
  return (
    <Stack data-testid={testId} direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography sx={{ fontSize: size, fontWeight: bold ? 700 : 500, color: bold ? 'text.primary' : 'text.secondary' }}>
        {label}
      </Typography>
      <Typography data-testid={`${testId}-value`} noWrap sx={{ fontSize: size, fontWeight: bold ? 700 : 600, textAlign: 'right', minWidth: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** The gift card's own checkout — face value only, no coupons, coins or fees.
 * Contact comes from the profile; the card is created only on payment success. */
export default function GiftCardCheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const selection = (location.state as GiftCardSelection | null) ?? null;
  const { data: financeData } = useQuery<any>(PUBLIC_FINANCE);
  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';
  // What an agent needs if a payment times out and a ticket has to be opened.
  const failure = usePaymentFailure(() => ({
    description: t('mweb.giftCards.checkoutTitle'),
    amount: selection?.amount ?? 0,
    currencySymbol,
  }));
  const payment = useGiftCardPayment({ onPaymentFailure: failure.report });
  // Same three account facts the server checks before it will take money.
  // Must sit with the other hooks: the early returns below would otherwise
  // skip it and change the hook order between renders.
  const eligibility = useCheckoutEligibility();

  // Reached directly (refresh, pasted URL) — there is nothing to charge yet.
  if (!selection) return <Navigate to="/gift-cards" replace />;
  if (payment.success) {
    return (
      <GiftCardSuccessCard payment={payment.success} gift={selection.gift} recipientEmail={selection.recipient_email} />
    );
  }

  const amountLabel = formatMoney(selection.amount, { symbol: currencySymbol });
  const shopTheme = t('mweb.giftCards.shopTheme');
  const themeValue = selection.scope_type === 'SHOP' ? shopTheme : selection.scope_name;
  const recipientValue = selection.gift
    ? selection.recipient_name || selection.recipient_email
    : t('mweb.giftCards.checkoutSelf');
  const { me, billingForm } = payment;
  const contact: CheckoutContact | null = me
    ? {
        fullName: [me.first_name, me.last_name].filter(Boolean).join(' ').trim(),
        email: me.email ?? '',
        phoneExtension: me.phone_extension ?? '',
        phoneNumber: me.phone_number ?? '',
      }
    : null;

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
          scopeType={selection.scope_type}
          scopeCategoryId={selection.scope_category_id}
          scopeName={selection.scope_name}
          scopeImageUrl={selection.scope_image_url}
          artworkFrontUrl={selection.scope_image_front_url}
          artworkBackUrl={selection.scope_image_back_url}
          amount={selection.amount}
          currencySymbol={currencySymbol}
        />
        <Card sx={{ p: 2 }}>
          <Stack spacing={1.25}>
            <SummaryRow testId="gift-card-checkout-theme" label={t('mweb.giftCards.checkoutTheme')} value={themeValue} />
            <SummaryRow testId="gift-card-checkout-amount" label={t('mweb.giftCards.checkoutAmount')} value={amountLabel} />
            <SummaryRow testId="gift-card-checkout-recipient" label={t('mweb.giftCards.checkoutRecipient')} value={recipientValue} />
            <Divider />
            <SummaryRow testId="gift-card-checkout-total" bold label={t('mweb.giftCards.checkoutTotal')} value={amountLabel} />
          </Stack>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1.5 }}>
            {t('mweb.giftCards.checkoutNote')}
          </Typography>
        </Card>
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
          disabled={
            payment.submitting ||
            payment.financeLoading ||
            !me?.email ||
            eligibility.missing.length > 0
          }
          onClick={billingForm.handleSubmit((values) => payment.pay(selection, values))}
        >
          {t('mweb.giftCards.payCta', { vars: { amount: amountLabel } })}
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
