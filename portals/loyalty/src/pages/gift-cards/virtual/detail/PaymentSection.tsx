import { Chip, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { SectionCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation, type Translator } from '@duncit/app-settings';
import InfoGrid from '../../../../components/detail/InfoGrid';
import { urlConfigs } from '../../../../config/url-configs';
import type { GiftCardPaymentSummary } from './queries';

const STEP_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  DONE: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  SKIPPED: 'default',
};

/** Literal keys per step status — the localization gate greps for `t('…')`. */
const stepLabel = (t: Translator['t'], status: string): string => {
  switch (status) {
    case 'DONE':
      return t('loyalty.virtual.stepDone');
    case 'FAILED':
      return t('loyalty.virtual.stepFailed');
    case 'SKIPPED':
      return t('loyalty.virtual.stepSkipped');
    default:
      return t('loyalty.virtual.stepPending');
  }
};

function StepChip({ status, label }: Readonly<{ status: string; label: string }>) {
  return <Chip size="small" variant="outlined" color={STEP_COLORS[status] ?? 'default'} label={label} />;
}

/**
 * The purchase as Finance recorded it — what was charged and how, and whether
 * the card was issued and mailed. The full payment audit lives in the Finance
 * console; this links there rather than copying it.
 */
export default function PaymentSection({ payment }: Readonly<{ payment: GiftCardPaymentSummary | null }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  if (!payment) {
    return (
      <SectionCard title={t('loyalty.virtual.paymentTitle')}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('loyalty.virtual.paymentMissing')}
        </Typography>
      </SectionCard>
    );
  }

  const money = (n: number) => formatMoney(n, { symbol: payment.currency_symbol });
  const financeLink = (
    <Link
      href={`${urlConfigs.financeUrl}/payment-logs/${payment.id}`}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
    >
      {t('loyalty.virtual.openInFinance')}
      <OpenInNewIcon fontSize="inherit" />
    </Link>
  );

  return (
    <SectionCard title={t('loyalty.virtual.paymentTitle')} action={financeLink}>
      <Stack spacing={2}>
        <InfoGrid
          items={[
            { key: 'payment-id', label: t('loyalty.virtual.paymentId'), value: payment.payment_id },
            { key: 'invoice', label: t('loyalty.virtual.invoice'), value: payment.invoice_no || EM_DASH },
            { key: 'payment-status', label: t('loyalty.virtual.paymentStatus'), value: payment.status },
            { key: 'gateway', label: t('loyalty.virtual.gateway'), value: payment.gateway || EM_DASH },
            { key: 'gateway-ref', label: t('loyalty.virtual.gatewayRef'), value: payment.gateway_ref || EM_DASH },
            {
              key: 'paid-at',
              label: t('loyalty.virtual.paidAt'),
              value: payment.paid_at ? formatDateTime(payment.paid_at) : EM_DASH,
            },
            { key: 'subtotal', label: t('loyalty.virtual.subtotal'), value: money(payment.subtotal) },
            { key: 'platform-fee', label: t('loyalty.virtual.platformFee'), value: money(payment.platform_fee_amount) },
            { key: 'gst', label: t('loyalty.virtual.gst'), value: money(payment.gst_amount) },
            {
              key: 'coupon',
              label: t('loyalty.virtual.coupon'),
              value: payment.coupon_code ? `${payment.coupon_code} (−${money(payment.coupon_discount)})` : EM_DASH,
            },
            { key: 'coins-used', label: t('loyalty.virtual.coinsUsed'), value: money(payment.coins_redeemed) },
            { key: 'total', label: t('loyalty.virtual.total'), value: money(payment.total) },
          ]}
        />
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {t('loyalty.virtual.issueStep')}
            </Typography>
            <StepChip status={payment.issue_step_status} label={stepLabel(t, payment.issue_step_status)} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {t('loyalty.virtual.emailStep')}
            </Typography>
            <StepChip status={payment.email_step_status} label={stepLabel(t, payment.email_step_status)} />
          </Stack>
        </Stack>
        {payment.email_step_detail && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {payment.email_step_detail}
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
