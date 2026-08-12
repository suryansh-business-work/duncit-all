import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { money, type PaymentCouponInfo } from './queries';

interface Props {
  coupon: PaymentCouponInfo;
  currencySymbol: string;
}

/**
 * The discount actually taken off this bill, next to the coupon rule as it
 * stands today. The two can disagree — a coupon stays editable and deletable
 * after the payment — so both are shown rather than one standing for the other.
 */
export default function CouponCard({ coupon, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('finance.payment.couponTitle')}
        </Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>
          <InfoRow variant="split" label={t('finance.payment.couponCode')} value={coupon.code} />
          <InfoRow variant="split" label={t('finance.payment.discountCharged')} value={money(currencySymbol, coupon.discount)} />
          <InfoRow variant="split" label={t('finance.payment.discountType')} value={coupon.discount_type} />
          <InfoRow variant="split" label={t('finance.payment.discountValue')} value={String(coupon.discount_value)} />
          <InfoRow variant="split" label={t('finance.payment.couponName')} value={coupon.title} />
        </Stack>
        {!coupon.still_exists && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {t('finance.payment.couponDeleted')}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
