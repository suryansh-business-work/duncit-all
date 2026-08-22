import type { ReactNode } from 'react';
import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow, StatusChip } from '@duncit/ui';
import {
  BACKOUT_STATUS_COLORS,
  BACKOUT_STATUS_LABELS,
  fmtDate,
  money,
  REFUND_STATUS_COLORS,
  type BackoutRefundDetail,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

function InfoCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 260, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

interface Props {
  request: BackoutRefundDetail;
  sym: string;
}

/** All info cards for a single Backout request (pod, host/club, attempts,
 * replacement, member, payment, refund). Hoisted InfoRow/InfoCard keep the
 * render flat. */
export default function BackoutRefundInfoCards({ request, sym }: Readonly<Props>) {
  const { t } = useTranslation();
  const { pod } = request;
  const image = pod?.pod_images_and_videos?.find((m) => m.type === 'IMAGE')?.url;
  const hosts = pod?.host_names?.length ? pod.host_names.join(', ') : '—';
  const replacementConfirmed = request.replacement_confirmed ? 'Yes' : 'No';

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" alignItems="flex-start">
      <InfoCard title={t('finance.common.pod')}>
        {image && (
          <Box
            component="img"
            src={image}
            alt={pod?.pod_title ?? 'Pod'}
            sx={{ width: '100%', borderRadius: 2, mb: 1, maxHeight: 180, objectFit: 'cover' }}
          />
        )}
        <InfoRow variant="split" label={t('shell.common.title')} value={pod?.pod_title ?? '—'} />
        <InfoRow variant="split" label={t('finance.common.date')} value={fmtDate(pod?.pod_date_time)} />
        <InfoRow variant="split" label={t('shell.common.type')} value={pod?.pod_type ?? '—'} />
        <InfoRow variant="split" label={t('finance.backoutRefund.spots')} value={pod ? String(pod.no_of_spots) : '—'} />
      </InfoCard>

      <InfoCard title={t('finance.backoutRefund.hostAndClub')}>
        <InfoRow variant="split" label={t('finance.common.hosts')} value={hosts} />
        <InfoRow variant="split" label={t('finance.backoutRefund.club')} value={pod?.club?.club_name ?? '—'} />
        <InfoRow variant="split" label={t('finance.backoutRefund.clubSlug')} value={pod?.club_slug ?? '—'} />
        {pod?.venue_id ? <InfoRow variant="split" label={t('finance.common.venue')} value={pod.venue_id} /> : null}
      </InfoCard>

      <InfoCard title={t('finance.backoutRefund.backoutAttempts')}>
        <Typography variant="h4" fontWeight={800} data-testid="backout-attempts-metric">
          {request.backout_attempts_used} / {request.max_backout_attempts}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Backout attempts this member has used for this pod (max set in Admin › Pod Settings).
        </Typography>
      </InfoCard>

      <InfoCard title={t('finance.backoutRefund.replacementConfirmed')}>
        <Typography
          variant="h4"
          fontWeight={800}
          color={request.replacement_confirmed ? 'success.main' : 'text.secondary'}
          data-testid="replacement-confirmed-metric"
        >
          {replacementConfirmed}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Derived from the latest timeline status — Yes only once the released seat was rebooked.
        </Typography>
      </InfoCard>

      <InfoCard title={t('finance.backoutRefund.member')}>
        <InfoRow variant="split" label={t('shell.common.name')} value={request.user_name ?? '—'} />
        <InfoRow variant="split" label={t('shell.common.email')} value={request.user_email ?? '—'} />
        <InfoRow variant="split" label={t('shell.common.phone')} value={request.user_phone ?? '—'} />
        <InfoRow variant="split" label={t('finance.backoutRefund.userId')} value={request.user_id} />
        <InfoRow variant="split" label={t('finance.backoutRefund.joined')} value={fmtDate(request.joined_at)} />
        <InfoRow variant="split" label={t('finance.backoutRefund.backedOut')} value={fmtDate(request.backed_out_at)} />
      </InfoCard>

      <InfoCard title={t('finance.backoutRefund.replacement')}>
        <InfoRow variant="split" label={t('shell.common.name')} value={request.replacement_user_name ?? '—'} />
        <InfoRow variant="split" label={t('shell.common.email')} value={request.replacement_user_email ?? '—'} />
        <InfoRow variant="split" label={t('finance.backoutRefund.userId')} value={request.replacement_user_id ?? '—'} />
        <Typography variant="caption" color="text.secondary">
          The member whose join closed this Backout. Blank on requests filled
          before Duncit started recording it.
        </Typography>
      </InfoCard>

      <InfoCard title={t('finance.common.payment')}>
        <InfoRow variant="split" label={t('finance.common.amount')} value={money(sym, Number(request.payment_amount ?? 0))} />
        <InfoRow variant="split" label={t('finance.backoutRefund.currency')} value={request.payment_currency ?? '—'} />
        <InfoRow variant="split" label={t('shell.common.status')} value={request.payment_status ?? '—'} />
        <InfoRow variant="split" label={t('finance.backoutRefund.paymentId')} value={request.payment_id ?? '—'} />
      </InfoCard>

      <InfoCard title={t('finance.common.refund')}>
        <InfoRow variant="split" label={t('finance.backoutRefund.backoutId')} value={request.backout_no} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{t('finance.backoutRefund.backoutStatus')}</Typography>
          <StatusChip
            status={request.backout_status}
            label={BACKOUT_STATUS_LABELS[request.backout_status]}
            colorMap={BACKOUT_STATUS_COLORS}
          />
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{t('finance.backoutRefund.refundStatus')}</Typography>
          <StatusChip status={request.refund_status} colorMap={REFUND_STATUS_COLORS} />
        </Stack>
        <InfoRow variant="split" label={t('finance.backoutRefund.deduction')} value={`${request.deduction_pct}%`} />
        <InfoRow
          variant="split"
          label={t('finance.backoutRefund.refundPayable')}
          value={request.refund_amount == null ? '—' : money(sym, request.refund_amount)}
        />
        <InfoRow variant="split" label={t('finance.backoutRefund.processedAt')} value={fmtDate(request.refund_processed_at)} />
      </InfoCard>
    </Stack>
  );
}
