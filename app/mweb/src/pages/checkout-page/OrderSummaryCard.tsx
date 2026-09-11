import { useState } from 'react';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import { alpha } from '@mui/material/styles';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMoney } from './checkoutMath';
import VenueChargesDialog, { type VenueCharge } from './VenueChargesDialog';
import CoinSummaryRows from './CoinSummaryRows';
import { isVideoMedia, videoSourceUrl, type CoinCheckoutSummary } from '@duncit/utils';
import { formatDateTime } from '../../utils/dateFormat';

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
  const { t } = useTranslation();
  // The buyer chose this on Pod Details and the ticket price is × it, so the
  // number has to be visible here — a silent multiplier reads as a wrong price.
  const seatsText =
    seats === 1 ? t('mweb.checkout.seatsOne') : t('mweb.checkout.seatsMany', { count: seats });
  const title = pod?.pod_title || stateTitle || t('mweb.checkout.podBooking');
  const when = formatDateTime(pod?.pod_date_time);
  const whenWhere = [when, pod?.zone_name].filter(Boolean).join(' · ');
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const media = (pod?.pod_images_and_videos ?? []).find((item: any) => item?.url);
  const mediaIsVideo = isVideoMedia(media);
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
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ p: 2 }}>
        {media?.url && (
          <Box sx={{ height: 140, borderRadius: '18px', overflow: 'hidden', bgcolor: 'action.hover', mb: 1.5 }}>
            <Box component={mediaIsVideo ? 'video' : 'img'} src={mediaIsVideo ? videoSourceUrl(media.url) : media.url} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
        )}
        <Typography noWrap sx={{ fontSize: 16, fontWeight: 600 }}>{title}</Typography>
        {whenWhere && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {whenWhere}
          </Typography>
        )}
        <Chip
          size="small"
          icon={<GroupsIcon />}
          label={seatsText}
          sx={(theme) => ({ mt: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main', '& .MuiChip-icon': { color: 'primary.main' } })}
        />
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
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{t('mweb.checkout.inclusiveOf')}</Typography>
          <Row label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })} value={fmt(breakup.gst)} />
          <Divider sx={{ my: 1 }} />
          <Row label={t('mweb.checkout.totalPayable')} value={fmt(breakup.total)} bold />
          <CoinSummaryRows coins={coins} />
          {venueCharges.length > 0 && (
            <Box sx={{ mt: 1, p: 1.5, borderRadius: '16px', bgcolor: 'action.hover' }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                <Stack direction="row" spacing={0.5} sx={{
                  alignItems: "center"
                }}>
                  <Typography variant="body2" sx={{
                    fontWeight: 600
                  }}>{t('mweb.checkout.venueCharges')}</Typography>
                  <DuncitIconButton size="small" aria-label={t('mweb.checkout.venueChargesAbout')} onClick={() => setVenueInfoOpen(true)} sx={{ p: 0.25 }}>
                    <InfoOutlinedIcon fontSize="inherit" color="action" />
                  </DuncitIconButton>
                </Stack>
                <Typography variant="body2" sx={{
                  fontWeight: 700
                }}>{fmt(venueTotal)}</Typography>
              </Stack>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>{t('mweb.checkout.venuePayAtVenue')}</Typography>
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
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={{
          fontWeight: bold ? 700 : 500,
          color: tone ?? (bold ? 'text.primary' : 'text.secondary')
        }}>{label}</Typography>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={{
          fontWeight: bold ? 700 : 600,
          color: tone
        }}>{value}</Typography>
    </Stack>
  );
}
