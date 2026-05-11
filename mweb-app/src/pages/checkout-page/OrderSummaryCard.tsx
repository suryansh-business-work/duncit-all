import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { formatMoney } from './checkoutMath';

interface Props {
  pod: any;
  stateTitle?: string;
  breakup: any;
}

export default function OrderSummaryCard({ pod, stateTitle, breakup }: Props) {
  const title = pod?.pod_title || stateTitle || 'Pod booking';
  const when = pod?.pod_date_time ? new Date(pod.pod_date_time).toLocaleString() : '';
  const fmt = (value: number) => formatMoney(breakup.currency, value);

  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Order Summary</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
        {when && <Typography variant="caption" color="text.secondary">{when}</Typography>}
        {pod?.zone_name && <Typography variant="caption" color="text.secondary" display="block">{pod.zone_name}</Typography>}
        <Divider sx={{ my: 2 }} />
        <Stack spacing={0.75}>
          <Row label="Ticket price" value={fmt(breakup.total)} />
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">Inclusive of:</Typography>
          <Row label={`Platform Fee (${breakup.feePct}%)`} value={fmt(breakup.fee)} />
          <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Total payable" value={fmt(breakup.total)} bold />
        </Stack>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>{value}</Typography>
    </Stack>
  );
}
