import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import GatewayChip from '../GatewayChip';
import OrderSummaryCard from '../OrderSummaryCard';
import PaymentDetailsCard from '../PaymentDetailsCard';
import ProcessingBackdrop from '../ProcessingBackdrop';
import AlreadyBookedDialog from '../AlreadyBookedDialog';
import type { useCheckoutSession } from '../useCheckoutSession';
import type { usePodCheckoutBill } from '../usePodCheckoutBill';
import { PaymentFailureDialog, type usePaymentFailure } from '../../../components/payment-failure';
import { IssueNotice, type useServerIssue } from '../../../components/issue-notice';
import { useTranslation } from '../../../i18n/useTranslation';
import { RentalBillRows, RentalTermsConsent } from '../../pod-rent/RentalCheckoutBlock';
import type { CheckoutRentals } from '../../pod-rent/useCheckoutRentals';

/** The inner page's back control — a 40px round surface button. */
const roundBackSx = {
  width: 40,
  height: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
  '&:hover': { bgcolor: 'background.paper' },
};

type Bill = ReturnType<typeof usePodCheckoutBill>;

interface CheckoutViewProps {
  session: ReturnType<typeof useCheckoutSession>;
  pod: ComponentProps<typeof OrderSummaryCard>['pod'];
  podError?: { message: string };
  serverIssue: ReturnType<typeof useServerIssue>;
  stateTitle: string;
  bill: Omit<Bill, 'breakup' | 'amount'>;
  breakup: NonNullable<Bill['breakup']>;
  seats: number;
  /** Dates of a recurring pod booked together (absent: one pod or one date). */
  dates?: number;
  rentals: CheckoutRentals;
  submit: () => void;
  payment: ReturnType<typeof usePaymentFailure>;
  alreadyBookedOpen: boolean;
  onCloseAlreadyBooked: () => void;
}

/** The pod checkout once its bill is ready: header, order summary, pay card and dialogs. */
export default function CheckoutView({
  session,
  pod,
  podError,
  serverIssue,
  stateTitle,
  bill,
  breakup,
  seats,
  dates,
  rentals,
  submit,
  payment,
  alreadyBookedOpen,
  onCloseAlreadyBooked,
}: Readonly<CheckoutViewProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unitAmount, base, coins, payBreakup, coinSummary, discounts } = bill;
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }} data-testid="checkout-screen">
      <Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
          <DuncitIconButton
            onClick={() => navigate(-1)}
            aria-label={t('mweb.common.goBack')}
            sx={roundBackSx}
            data-testid="checkout-back"
          >
            <ArrowBackIcon fontSize="small" />
          </DuncitIconButton>
          <Typography component="h1" noWrap sx={{ flex: 1, minWidth: 0, fontSize: 20, fontWeight: 600 }}>
            {t('mweb.checkout.title')}
          </Typography>
          <GatewayChip finance={session.finance} />
        </Stack>
        {podError && <Alert severity="error" data-testid="checkout-error" sx={{ mb: 2 }}>{podError.message}</Alert>}
        {serverIssue.issue && (
          <Box sx={{ mb: 2 }}>
            <IssueNotice issue={serverIssue.issue} page="/checkout" onClose={serverIssue.clear} />
          </Box>
        )}
        {/* No "Deliver to" picker here: a pod ships nothing, and rented items are collected at the venue. */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <OrderSummaryCard pod={pod} stateTitle={stateTitle} breakup={payBreakup ?? breakup} grossTotal={breakup.total} discounts={discounts} seats={seats} dates={dates} unitAmount={unitAmount} coins={coinSummary} roundOff={payBreakup ? coins.roundOff : 0} rentals={rentals.totals.count > 0 ? { rows: <RentalBillRows rentals={rentals} />, total: rentals.totals.total } : null} />
          <PaymentDetailsCard
            control={session.control}
            onSubmit={submit}
            error={session.error}
            submitting={session.submitting}
            total={breakup.total + rentals.totals.total}
            effectiveTotal={coins.effectiveTotal + rentals.totals.total}
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
            onApplyCoupon={(code) => session.applyCoupon(base, code)}
            onRemoveCoupon={session.removeCoupon}
            coins={coins}
            beforePay={<RentalTermsConsent rentals={rentals} />}
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
        onClose={onCloseAlreadyBooked}
        onHistory={() => navigate('/pod-history')}
      />
      <ProcessingBackdrop open={session.submitting} message={session.confirmingMessage} />
    </Box>
  );
}
