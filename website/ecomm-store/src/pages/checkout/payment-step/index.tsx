import { Alert, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { useCart } from '../../../app/providers/CartProvider';
import { useStoreSession } from '../../../app/providers/SessionProvider';
import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { CouponForm } from '../../../components/cart/coupon-form';
import { CodOtpForm } from '../../../components/cod-otp';
import { useStoreT } from '../../../i18n';
import { GiftCardForm } from '../gift-card-form';
import type { CheckoutQuoteState } from '../useCheckoutQuote';
import type { CheckoutControls } from '../useCheckoutState';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { QuoteSummary } from './QuoteSummary';

interface PaymentStepProps {
  controls: CheckoutControls;
  quoteState: CheckoutQuoteState;
}

/** Whether the COD phone check is still owed for the number on this order. */
export function codCheckPending(controls: CheckoutControls, codRequiresOtp: boolean): boolean {
  const { method, codChallenge, contact } = controls.state;
  if (method !== 'COD' || !codRequiresOtp) return false;
  return codChallenge?.phone !== contact?.phone;
}

/** Step 3: coupon, coins and gift cards, how to pay, and the live total. */
export function PaymentStep({ controls, quoteState }: Readonly<PaymentStepProps>) {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  const { signedIn } = useStoreSession();
  const { cart } = useCart();
  const { quote, loading, error, coinBalance, refetchCoins } = quoteState;
  const phone = controls.state.contact?.phone ?? '';
  const pendingCod = codCheckPending(controls, settings.cod_requires_otp);
  if (!quote) {
    if (error) return <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert>;
    return <Loader label={t('ecommStore.checkout.pricing')} />;
  }
  const blocked = !quote.serviceable || quote.below_minimum || quote.has_issues || pendingCod;
  return (
    <Stack spacing={2.5}>
      {cart ? <CouponForm cart={cart} /> : null}
      {signedIn ? (
        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={controls.state.useCoins} disabled={coinBalance <= 0} onChange={(e) => controls.setUseCoins(e.target.checked)} />}
            label={t('ecommStore.checkout.useCoins', { vars: { coins: coinBalance } })}
          />
          <GiftCardForm onRedeemed={refetchCoins} />
        </Stack>
      ) : null}
      <Divider />
      <PaymentMethodPicker quote={quote} method={controls.state.method} onChange={controls.setMethod} />
      {settings.dummy_mode && controls.state.method !== 'COD' ? (
        <Alert severity="warning" data-testid="checkout-test-mode">
          {t('ecommStore.payment.testMode')}
        </Alert>
      ) : null}
      {controls.state.method === 'COD' && settings.cod_requires_otp ? (
        <CodOtpForm phone={phone} verified={!pendingCod} onVerified={(id) => controls.setCodChallenge(id, phone)} />
      ) : null}
      <Divider />
      <Typography variant="h4" component="h3">
        {t('ecommStore.checkout.summary')}
      </Typography>
      {loading ? <Loader variant="inline" label={t('ecommStore.checkout.pricing')} showLabel /> : null}
      <QuoteSummary quote={quote} />
      <DuncitButton variant="contained" size="large" disabled={blocked} onClick={controls.toReview} sx={{ alignSelf: 'flex-start' }}>
        {t('ecommStore.checkout.reviewOrder')}
      </DuncitButton>
    </Stack>
  );
}
