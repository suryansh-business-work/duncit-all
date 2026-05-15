import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { formatMoney } from './checkoutMath';

interface Props {
  pod: any;
  stateTitle?: string;
  breakup: any;
}

export default function OrderSummaryCard({ pod, stateTitle, breakup }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const title = pod?.pod_title || stateTitle || 'Pod booking';
  const when = pod?.pod_date_time ? new Date(pod.pod_date_time).toLocaleString() : '';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const media = (pod?.pod_images_and_videos ?? []).find((item: any) => item?.url);

  return (
    <Card sx={{ flex: 1, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent sx={{ p: 1.25 }}>
        <Box sx={{ height: 150, borderRadius: 3, overflow: 'hidden', position: 'relative', bgcolor: 'rgba(255,255,255,0.08)' }}>
          {media?.url && <Box component={media.type === 'VIDEO' ? 'video' : 'img'} src={media.url} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 12%, rgba(0,0,0,0.75) 100%)' }} />
          <Box sx={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 0, lineHeight: 1 }}>Ticket</Typography>
            <Typography variant="subtitle1" fontWeight={900} noWrap>{title}</Typography>
            {when && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.74)' }}>{when}</Typography>}
          </Box>
        </Box>
        {pod?.zone_name && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{pod.zone_name}</Typography>}
        <Divider sx={{ my: 1.5 }} />
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
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 700}>{value}</Typography>
    </Stack>
  );
}
