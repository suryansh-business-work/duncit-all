import { useState } from 'react';
import { Box, Card, CardContent, Chip, Divider, IconButton, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMoney } from './checkoutMath';
import VenueChargesDialog, { type VenueCharge } from './VenueChargesDialog';
import CoinSummaryRows from './CoinSummaryRows';
import type { CoinCheckoutSummary } from '@duncit/utils';

/** One line of money taken off the bill — a coupon, redeemed coins. */
export interface CheckoutDiscount {
  key: string;
  label: string;
  amount: number;
}

interface Props {
  pod: any;
  stateTitle?: string;
  /**
   * The breakup of what is ACTUALLY charged. When coins or a coupon are
   * applied the gross shrinks and the tax inside it shrinks with it — the
   * server re-quotes on the discounted amount — so this has to be the
   * discounted breakup or the GST row would describe money nobody pays.
   */
  breakup: any;
  /** The bill before any discount, for the ticket line above the deductions. */
  grossTotal?: number;
  /** Deductions to list between the ticket line and the tax. */
  discounts?: CheckoutDiscount[];
  /** Seats picked on Pod Details — the total already multiplies by this. */
  seats?: number;
  /** Price of ONE seat, so the multiplied total below can be reconciled. */
  unitAmount?: number;
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
}

export default function OrderSummaryCard({
  pod,
  stateTitle,
  breakup,
  grossTotal,
  discounts = [],
  seats = 1,
  unitAmount = 0,
  coins = null,
}: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  // The buyer chose this on Pod Details and the ticket price is × it, so the
  // number has to be visible here — a silent multiplier reads as a wrong price.
  const seatsText =
    seats === 1 ? t('mweb.checkout.seatsOne') : t('mweb.checkout.seatsMany', { count: seats });
  const isDark = theme.palette.mode === 'dark';
  const title = pod?.pod_title || stateTitle || t('mweb.checkout.podBooking');
  const when = pod?.pod_date_time ? new Date(pod.pod_date_time).toLocaleString() : '';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const media = (pod?.pod_images_and_videos ?? []).find((item: any) => item?.url);
  // Pod checkout is membership only — the ticket is the whole bill. Products
  // are purchased separately through the standalone product checkout. This is
  // the price BEFORE deductions, so the rows below have something to subtract
  // from; with no discount it is the payable, exactly as it always was.
  const ticketTotal = Number(grossTotal ?? breakup.total);
  // Venue charges are paid directly at the venue — shown for transparency but
  // NOT added to the online "Total payable".
  const venueCharges: VenueCharge[] = pod?.place_charges ?? [];
  const venueTotal = venueCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
  const [venueInfoOpen, setVenueInfoOpen] = useState(false);

  return (
    <Card sx={{ flex: 1, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent sx={{ p: 1.25 }}>
        <Box sx={{ height: 150, borderRadius: '16px', overflow: 'hidden', position: 'relative', bgcolor: 'rgba(255,255,255,0.08)' }}>
          {media?.url && <Box component={media.type === 'VIDEO' ? 'video' : 'img'} src={media.url} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 12%, rgba(0,0,0,0.75) 100%)' }} />
          <Box sx={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 0, lineHeight: 1 }}>{t('mweb.checkout.ticket')}</Typography>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{title}</Typography>
            {when && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.74)' }}>{when}</Typography>}
          </Box>
        </Box>
        <Chip
          size="small"
          color="primary"
          icon={<GroupsIcon />}
          label={seatsText}
          sx={{ mt: 1, fontWeight: 700 }}
        />
        {pod?.zone_name && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{pod.zone_name}</Typography>}
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={0.75}>
          {seats > 1 && unitAmount > 0 && (
            <Row
              label={t('mweb.checkout.ticketMultiplier', { vars: { price: fmt(unitAmount), seats } })}
              value={fmt(unitAmount * seats)}
            />
          )}
          <Row label={t('mweb.checkout.ticketPrice')} value={fmt(ticketTotal)} />
          {discounts.map((discount) => (
            <Row
              key={discount.key}
              label={discount.label}
              value={`− ${fmt(discount.amount)}`}
              tone="success.main"
            />
          ))}
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">{t('mweb.checkout.inclusiveOf')}</Typography>
          <Row label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })} value={fmt(breakup.gst)} />
          <Divider sx={{ my: 1 }} />
          <Row label={t('mweb.checkout.totalPayable')} value={fmt(breakup.total)} bold />
          <CoinSummaryRows coins={coins} />
          {venueCharges.length > 0 && (
            <Box sx={{ mt: 1, p: 1.25, borderRadius: '16px', border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" fontWeight={600}>{t('mweb.checkout.venueCharges')}</Typography>
                  <IconButton size="small" aria-label={t('mweb.checkout.venueChargesAbout')} onClick={() => setVenueInfoOpen(true)} sx={{ p: 0.25 }}>
                    <InfoOutlinedIcon fontSize="inherit" color="action" />
                  </IconButton>
                </Stack>
                <Typography variant="body2" fontWeight={700}>{fmt(venueTotal)}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">{t('mweb.checkout.venuePayAtVenue')}</Typography>
            </Box>
          )}
        </Stack>
        <VenueChargesDialog open={venueInfoOpen} charges={venueCharges} currency={breakup.currency} onClose={() => setVenueInfoOpen(false)} />
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: Readonly<{ label: string; value: string; bold?: boolean; tone?: string }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500} sx={{ color: tone }}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 600} sx={{ color: tone }}>{value}</Typography>
    </Stack>
  );
}
