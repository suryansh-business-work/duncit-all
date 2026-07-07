import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { fmtDate, money, REFUND_STATUS_COLORS, type BackoutRefundDetail } from './queries';

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

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

/** All info cards for a single backed-out membership (pod, host/club, member,
 * payment, refund). Hoisted InfoRow/InfoCard keep the render flat. */
export default function BackoutRefundInfoCards({ request, sym }: Readonly<Props>) {
  const { pod } = request;
  const image = pod?.pod_images_and_videos?.find((m) => m.type === 'IMAGE')?.url;
  const hosts = pod?.host_names?.length ? pod.host_names.join(', ') : '—';

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" alignItems="flex-start">
      <InfoCard title="Pod">
        {image && (
          <Box
            component="img"
            src={image}
            alt={pod?.pod_title ?? 'Pod'}
            sx={{ width: '100%', borderRadius: 2, mb: 1, maxHeight: 180, objectFit: 'cover' }}
          />
        )}
        <InfoRow label="Title" value={pod?.pod_title ?? '—'} />
        <InfoRow label="Date" value={fmtDate(pod?.pod_date_time)} />
        <InfoRow label="Type" value={pod?.pod_type ?? '—'} />
        <InfoRow label="Spots" value={pod ? String(pod.no_of_spots) : '—'} />
      </InfoCard>

      <InfoCard title="Host & Club">
        <InfoRow label="Hosts" value={hosts} />
        <InfoRow label="Club" value={pod?.club?.club_name ?? '—'} />
        <InfoRow label="Club slug" value={pod?.club_slug ?? '—'} />
        {pod?.venue_id ? <InfoRow label="Venue" value={pod.venue_id} /> : null}
      </InfoCard>

      <InfoCard title="Member">
        <InfoRow label="Name" value={request.user_name ?? '—'} />
        <InfoRow label="Email" value={request.user_email ?? '—'} />
        <InfoRow label="Joined" value={fmtDate(request.joined_at)} />
        <InfoRow label="Backed out" value={fmtDate(request.backed_out_at)} />
      </InfoCard>

      <InfoCard title="Payment">
        <InfoRow label="Amount" value={money(sym, Number(request.payment_amount ?? 0))} />
        <InfoRow label="Currency" value={request.payment_currency ?? '—'} />
        <InfoRow label="Status" value={request.payment_status ?? '—'} />
        <InfoRow label="Payment ID" value={request.payment_id ?? '—'} />
      </InfoCard>

      <InfoCard title="Refund">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">Refund status</Typography>
          <Chip size="small" color={REFUND_STATUS_COLORS[request.refund_status]} label={request.refund_status} />
        </Stack>
        <InfoRow label="Refund threshold" value={`${request.refund_threshold_pct}%`} />
      </InfoCard>
    </Stack>
  );
}
