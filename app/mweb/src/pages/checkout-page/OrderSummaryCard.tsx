import { useState } from 'react';
import { Box, Card, CardContent, Divider, IconButton, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { alpha, useTheme } from '@mui/material/styles';
import { formatMoney } from './checkoutMath';
import VenueChargesDialog, { type VenueCharge } from './VenueChargesDialog';

interface Props {
  pod: any;
  stateTitle?: string;
  breakup: any;
  selectedProducts?: Array<{ product_id: string; quantity: number }>;
}

export default function OrderSummaryCard({ pod, stateTitle, breakup, selectedProducts = [] }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const title = pod?.pod_title || stateTitle || 'Pod booking';
  const when = pod?.pod_date_time ? new Date(pod.pod_date_time).toLocaleString() : '';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const media = (pod?.pod_images_and_videos ?? []).find((item: any) => item?.url);
  const selectedMap = new Map(selectedProducts.map((item) => [item.product_id, item.quantity]));
  const productItems = (pod?.product_requests ?? [])
    .filter((item: any) => selectedMap.has(item.product_id))
    .map((item: any) => ({ ...item, quantity: selectedMap.get(item.product_id) || 0, total_cost: Number(item.unit_cost || 0) * Number(selectedMap.get(item.product_id) || 0) }));
  const productTotal = productItems.reduce((sum: number, item: any) => sum + Number(item.total_cost || 0), 0);
  const ticketTotal = Math.max(0, Number(breakup.total) - productTotal);
  // Venue charges are paid directly at the venue — shown for transparency but
  // NOT added to the online "Total payable".
  const venueCharges: VenueCharge[] = pod?.place_charges ?? [];
  const venueTotal = venueCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
  const [venueInfoOpen, setVenueInfoOpen] = useState(false);

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
          <Row label="Ticket price" value={fmt(ticketTotal)} />
          {productItems.map((item: any) => (
            <Row key={item.product_id} label={`${item.product_name} x${item.quantity}`} value={fmt(item.total_cost)} />
          ))}
          {productTotal > 0 && <Row label="Product add-ons" value={fmt(productTotal)} />}
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">Inclusive of:</Typography>
          <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Total payable" value={fmt(breakup.total)} bold />
          {venueCharges.length > 0 && (
            <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" fontWeight={600}>Venue Charges</Typography>
                  <IconButton size="small" aria-label="About venue charges" onClick={() => setVenueInfoOpen(true)} sx={{ p: 0.25 }}>
                    <InfoOutlinedIcon fontSize="inherit" color="action" />
                  </IconButton>
                </Stack>
                <Typography variant="body2" fontWeight={700}>{fmt(venueTotal)}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">Payable directly at the venue</Typography>
            </Box>
          )}
        </Stack>
        <VenueChargesDialog open={venueInfoOpen} charges={venueCharges} currency={breakup.currency} onClose={() => setVenueInfoOpen(false)} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 700}>{value}</Typography>
    </Stack>
  );
}
