import { Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { fmt } from '../../payment-logs-page/helpers';
import DetailCard from './DetailCard';
import { VERIFICATION_COLORS, labelOf, verificationLabels } from '../labels';
import type { FailedPaymentDetail } from '../queries';

interface Props {
  detail: FailedPaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

const PAISE_PER_RUPEE = 100;

/** What the AI read off the evidence and what Razorpay itself says about the payment. */
export default function VerificationCard({ detail, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const v = detail.verification;
  const x = v.extracted;
  const confidence = v.confidence == null ? '' : `${Math.round(v.confidence * 100)}%`;
  const razorpayAmount =
    v.razorpay_amount_paise == null ? '' : fmt(v.razorpay_amount_paise / PAISE_PER_RUPEE, detail.currency_symbol);

  return (
    <DetailCard
      title={t('finance.failedPayments.verificationSection')}
      testId="failed-payment-verification-card"
      lines={[
        {
          label: t('finance.failedPayments.verificationStatus'),
          value: <StatusChip status={v.status} label={labelOf(verificationLabels(t), v.status)} colorMap={VERIFICATION_COLORS} />,
        },
        { label: t('finance.failedPayments.confidence'), value: confidence },
        { label: t('finance.failedPayments.matchedFields'), value: v.matched_fields.join(', ') },
        { label: t('finance.failedPayments.matchedPaymentId'), value: v.matched_payment_id },
        { label: t('finance.failedPayments.razorpayStatus'), value: v.razorpay_status },
        { label: t('finance.failedPayments.razorpayAmount'), value: razorpayAmount },
        { label: t('finance.failedPayments.checkedAt'), value: v.checked_at ? formatDateTime(v.checked_at) : '' },
        { label: t('finance.failedPayments.extractedPaymentId'), value: x?.payment_id },
        { label: t('finance.failedPayments.extractedUtr'), value: x?.utr },
        { label: t('finance.failedPayments.extractedAmount'), value: x?.amount == null ? '' : fmt(x.amount, detail.currency_symbol) },
        { label: t('finance.failedPayments.extractedDate'), value: x?.date },
        { label: t('finance.failedPayments.extractedStatus'), value: x?.status },
        { label: t('finance.failedPayments.extractedPayee'), value: x?.payee },
      ]}
    >
      {v.notes && (
        <Stack sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('finance.failedPayments.verificationNotes')}</Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{v.notes}</Typography>
        </Stack>
      )}
    </DetailCard>
  );
}
