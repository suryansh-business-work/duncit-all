import type { ReactNode } from 'react';
import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow, StatusChip } from '@duncit/ui';
import { fmtDate, money, REFUND_STATUS_COLORS, type BackoutRefundDetail } from './queries';

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
        <InfoRow variant="split" label="Title" value={pod?.pod_title ?? '—'} />
        <InfoRow variant="split" label="Date" value={fmtDate(pod?.pod_date_time)} />
        <InfoRow variant="split" label="Type" value={pod?.pod_type ?? '—'} />
        <InfoRow variant="split" label="Spots" value={pod ? String(pod.no_of_spots) : '—'} />
      </InfoCard>

      <InfoCard title="Host & Club">
        <InfoRow variant="split" label="Hosts" value={hosts} />
        <InfoRow variant="split" label="Club" value={pod?.club?.club_name ?? '—'} />
        <InfoRow variant="split" label="Club slug" value={pod?.club_slug ?? '—'} />
        {pod?.venue_id ? <InfoRow variant="split" label="Venue" value={pod.venue_id} /> : null}
      </InfoCard>

      <InfoCard title="Member">
        <InfoRow variant="split" label="Name" value={request.user_name ?? '—'} />
        <InfoRow variant="split" label="Email" value={request.user_email ?? '—'} />
        <InfoRow variant="split" label="Joined" value={fmtDate(request.joined_at)} />
        <InfoRow variant="split" label="Backed out" value={fmtDate(request.backed_out_at)} />
      </InfoCard>

      <InfoCard title="Payment">
        <InfoRow variant="split" label="Amount" value={money(sym, Number(request.payment_amount ?? 0))} />
        <InfoRow variant="split" label="Currency" value={request.payment_currency ?? '—'} />
        <InfoRow variant="split" label="Status" value={request.payment_status ?? '—'} />
        <InfoRow variant="split" label="Payment ID" value={request.payment_id ?? '—'} />
      </InfoCard>

      <InfoCard title="Refund">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">Refund status</Typography>
          <StatusChip status={request.refund_status} colorMap={REFUND_STATUS_COLORS} />
        </Stack>
        <InfoRow variant="split" label="Refund threshold" value={`${request.refund_threshold_pct}%`} />
      </InfoCard>
    </Stack>
  );
}
