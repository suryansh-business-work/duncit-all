import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
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
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Coupon
        </Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>
          <InfoRow variant="split" label="Code" value={coupon.code} />
          <InfoRow variant="split" label="Discount charged" value={money(currencySymbol, coupon.discount)} />
          <InfoRow variant="split" label="Discount type" value={coupon.discount_type} />
          <InfoRow variant="split" label="Discount value" value={String(coupon.discount_value)} />
          <InfoRow variant="split" label="Title" value={coupon.title} />
        </Stack>
        {!coupon.still_exists && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            This coupon record has since been deleted — only the code and the discount charged
            survive on the payment.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
