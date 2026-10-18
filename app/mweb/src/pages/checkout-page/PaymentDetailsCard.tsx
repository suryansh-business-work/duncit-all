import { Alert, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { DuncitButton } from '@duncit/buttons';
import SectionHeader from '../../components/SectionHeader';
import type { Control } from 'react-hook-form';
import type { AvailableCoupon, CheckoutContact, CheckoutForm, CouponPreview } from './queries';
import { CheckoutFields, type PostalAddressParts } from './checkout';
import { CHECKOUT_FIELD_SX } from './checkoutFieldSx';
import CouponField from './CouponField';
import CoinRedeemField from './CoinRedeemField';
import type { CoinRedemption } from './useCoinRedemption';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMoney } from './checkoutMath';
import { CheckoutRequirementsCard, useCheckoutEligibility } from '../../components/checkout-gate';
import type { DeliveryQuoteStatus } from '@duncit/utils';
import DeliveryQuoteNotice, { DELIVERY_QUOTE_NOTICE_ID } from './DeliveryQuoteNotice';

interface Props {
  control: Control<CheckoutForm>;
  onSubmit: () => void;
  error: string | null;
  submitting: boolean;
  total: number;
  currency: string;
  dummyMode: boolean;
  mainAddress: PostalAddressParts | null;
  hasMainAddress: boolean;
  contact: CheckoutContact | null;
  contactLoading: boolean;
  effectiveTotal: number;
  coupon: CouponPreview | null;
  couponCode: string;
  setCouponCode: (value: string) => void;
  couponError: string | null;
  applyingCoupon: boolean;
  availableCoupons: AvailableCoupon[];
  onApplyCoupon: (code?: string) => void;
  onRemoveCoupon: () => void;
  coins: CoinRedemption;
  /** Show required markers on the invoice-address fields. */
  addressRequired?: boolean;
  /** Where the delivery quote stands — the product checkout passes it, and Pay
   * stays shut until it is READY. The pod checkout ships nothing and omits it. */
  deliveryStatus?: DeliveryQuoteStatus;
  onRetryDelivery?: () => void;
}

export default function PaymentDetailsCard({
  control,
  onSubmit,
  error,
  submitting,
  total,
  currency,
  dummyMode,
  mainAddress,
  hasMainAddress,
  contact,
  contactLoading,
  effectiveTotal,
  coupon,
  couponCode,
  setCouponCode,
  couponError,
  applyingCoupon,
  availableCoupons,
  onApplyCoupon,
  onRemoveCoupon,
  coins,
  addressRequired = true,
  deliveryStatus = 'READY',
  onRetryDelivery,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const discounted = effectiveTotal < total;
  // The server refuses a payment from an account with no phone or no verified
  // email. Asking here means the buyer finds out before
  // filling in a card rather than after.
  const eligibility = useCheckoutEligibility();
  const blocked = eligibility.missing.length > 0;
  const fieldSx = CHECKOUT_FIELD_SX;
  const selectMenuProps = {
    PaperProps: {
      sx: {
        mt: 1,
        '& .MuiMenuItem-root': { minHeight: 42, fontWeight: 600, borderRadius: '12px', mx: 0.75, my: 0.25 },
      },
    },
  };

  return (
    <Card data-testid="payment-details-card" sx={{ flex: 1 }}>
      <CardContent sx={{ p: 2 }}>
        <SectionHeader testId="payment-details-header" title={t('mweb.checkout.paymentDetails')} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          <CheckoutFields
            control={control}
            fieldSx={fieldSx}
            dummyMode={dummyMode}
            selectMenuProps={selectMenuProps}
            mainAddress={mainAddress}
            hasMainAddress={hasMainAddress}
            contact={contact}
            contactLoading={contactLoading}
            addressRequired={addressRequired}
          />
          <Divider />
          <CouponField
            code={couponCode}
            setCode={setCouponCode}
            applied={coupon}
            error={couponError}
            applying={applyingCoupon}
            currency={currency}
            available={availableCoupons}
            onApply={onApplyCoupon}
            onRemove={onRemoveCoupon}
          />
          <Divider />
          <CoinRedeemField coins={coins} />
          {error && <Alert data-testid="checkout-error" severity="error">{error}</Alert>}
          {discounted && (
            <Typography data-testid="payment-details-card-savings" variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              <s>{formatMoney(currency, total)}</s> &nbsp;
              {t('mweb.checkout.youSave', {
                vars: { amount: formatMoney(currency, total - effectiveTotal) },
              })}
            </Typography>
          )}
          <CheckoutRequirementsCard missing={eligibility.missing} />
          <DeliveryQuoteNotice status={deliveryStatus} onRetry={onRetryDelivery} />
          <DuncitButton
            data-testid="checkout-submit"
            variant="contained"
            size="large"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
            onClick={onSubmit}
            disabled={submitting || total <= 0 || blocked || deliveryStatus !== 'READY'}
            aria-describedby={deliveryStatus === 'READY' ? undefined : DELIVERY_QUOTE_NOTICE_ID}
            sx={{ minHeight: 52 }}
          >
            {submitting
              ? t('mweb.checkout.processing')
              : t('mweb.checkout.pay', { vars: { amount: formatMoney(currency, effectiveTotal) } })}
          </DuncitButton>
          <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            {t('mweb.checkout.receiptNote')}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
