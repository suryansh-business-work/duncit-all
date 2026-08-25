import { useMemo } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import ArtifactsTable from './ArtifactsTable';
import StepsTimeline from './StepsTimeline';
import { inSegment } from './checkout-segments';
import type { PaymentDetail } from './queries';

interface Props {
  detail: PaymentDetail;
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * The work every checkout does whatever it bought: the capture, the invoice, the
 * coupon, the coins and the receipt.
 *
 * It sits OUTSIDE the purchase tabs on purpose — filing it under one of them
 * would bury the receipt of a gift-card payment behind the pod tab, and
 * repeating it in all three would invite three Retry buttons for one e-mail.
 */
export default function PaymentSection({
  detail,
  busyKey,
  onRetry,
  formatDateTime,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Memoised for the same reason as in SegmentPanel: the artifacts table keys
  // its "rows were rewritten" check on this array's identity.
  const artifacts = useMemo(() => inSegment(detail.artifacts, 'PAYMENT'), [detail.artifacts]);
  const steps = useMemo(() => inSegment(detail.steps, 'PAYMENT'), [detail.steps]);
  // Two keys rather than a suffixed plural: languages that do not split on one
  // pick whichever their catalogue defines.
  const attemptsKey =
    detail.finalize_attempts === 1
      ? 'finance.payment.finalizeAttemptsOne'
      : 'finance.payment.finalizeAttemptsMany';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {t('finance.payment.paymentSectionTitle')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            mb: 2
          }}>
          {t('finance.payment.paymentSectionCaption')} ·{' '}
          {t(attemptsKey, { vars: { n: detail.finalize_attempts } })}
        </Typography>
        <Stack spacing={2.5}>
          <ArtifactsTable
            artifacts={artifacts}
            tableId="finance-payment-artifacts"
            busyKey={busyKey}
            onRetry={onRetry}
          />
          <StepsTimeline
            steps={steps}
            busyKey={busyKey}
            onRetry={onRetry}
            formatDateTime={formatDateTime}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
