import { useQuery } from '@apollo/client';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import GatewayChip from '../checkout-page/GatewayChip';
import ProcessingBackdrop from '../checkout-page/ProcessingBackdrop';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { PaymentFailureDialog, usePaymentFailure } from '../../components/payment-failure';
import { CheckoutRequirementsCard, useCheckoutEligibility } from '../../components/checkout-gate';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardVisual from '../gift-cards-page/GiftCardVisual';
import type { GiftCardSelection } from '../gift-cards-page/queries';
import GiftCardSuccessCard from './GiftCardSuccessCard';
import { useGiftCardPayment } from './useGiftCardPayment';

function SummaryRow({ label, value, bold = false }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  const variant = bold ? 'subtitle2' : 'body2';
  return (
    <Stack direction="row" spacing={1} sx={{
      justifyContent: "space-between"
    }}>
      <Typography variant={variant} sx={{
        fontWeight: bold ? 700 : 500
      }}>
        {label}
      </Typography>
      <Typography
        variant={variant}
        noWrap
        sx={{
          fontWeight: bold ? 700 : 500,
          textAlign: 'right',
          minWidth: 0
        }}>
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
  const { data: financeData } = useQuery(PUBLIC_FINANCE);
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
  const me = payment.me;
  const contactName = [me?.first_name, me?.last_name].filter(Boolean).join(' ').trim();
  const contactPhone = [me?.phone_extension, me?.phone_number].filter(Boolean).join(' ').trim();

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <DuncitIconButton onClick={() => navigate(-1)} aria-label={t('mweb.common.goBack')} sx={{ bgcolor: 'action.hover' }}>
            <ArrowBackIcon />
          </DuncitIconButton>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              flex: 1
            }}>
            {t('mweb.giftCards.checkoutTitle')}
          </Typography>
          <GatewayChip finance={payment.finance} />
        </Stack>
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
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
          <Stack spacing={1}>
            <SummaryRow label={t('mweb.giftCards.checkoutTheme')} value={themeValue} />
            <SummaryRow label={t('mweb.giftCards.checkoutAmount')} value={amountLabel} />
            <SummaryRow label={t('mweb.giftCards.checkoutRecipient')} value={recipientValue} />
            <Divider />
            <SummaryRow bold label={t('mweb.giftCards.checkoutTotal')} value={amountLabel} />
          </Stack>
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: '16px' }}>
            {t('mweb.giftCards.checkoutNote')}
          </Alert>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
          <Typography variant="subtitle2" gutterBottom sx={{
            fontWeight: 700
          }}>
            {t('mweb.checkout.contactDetails')}
          </Typography>
          {payment.meLoading && !me ? (
            <Skeleton variant="text" width="60%" />
          ) : (
            <>
              {contactName && <Typography variant="body2">{contactName}</Typography>}
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {me?.email ?? ''}
              </Typography>
              {contactPhone && (
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {contactPhone}
                </Typography>
              )}
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {t('mweb.checkout.contactEditNote')}
              </Typography>
            </>
          )}
        </Paper>
        {payment.error && (
          <Alert severity="error" onClose={() => payment.setError(null)}>
            {payment.error}
          </Alert>
        )}
        <CheckoutRequirementsCard missing={eligibility.missing} />
        <DuncitButton
          variant="contained"
          size="large"
          disabled={
            payment.submitting ||
            payment.financeLoading ||
            !me?.email ||
            eligibility.missing.length > 0
          }
          onClick={() => payment.pay(selection)}
          sx={{ borderRadius: 999, fontWeight: 700 }}
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
