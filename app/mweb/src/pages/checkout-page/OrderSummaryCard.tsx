import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { alpha } from '@mui/material/styles';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMoney } from './checkoutMath';
import type { VenueCharge } from './VenueChargesDialog';
import VenueChargesBox from './VenueChargesBox';
import Row from './SummaryRow';
import CoinSummaryRows from './CoinSummaryRows';
import { exclusiveOfGstBill, isVideoMedia, round2, videoSourceUrl, type CoinCheckoutSummary } from '@duncit/utils';
import { formatDateTime } from '../../utils/dateFormat';

/** One line of money taken off the bill — the multi-ticket tier, a coupon, redeemed coins. */
export interface CheckoutDiscount {
  key: string;
  label: string;
  amount: number;
  testId?: string;
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
  /** Deductions (GST-inclusive) to list, net of GST, between the subtotal and the tax. */
  discounts?: CheckoutDiscount[];
  /** Seats picked on Pod Details — the total already multiplies by this. */
  seats?: number;
  /** Price of ONE seat, so the multiplied total below can be reconciled. */
  unitAmount?: number;
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
  /** What rounding the charge up to a whole rupee adds — on top of `breakup`,
   * which is the taxed value. Zero hides the row. */
  roundOff?: number;
  /** Rented items charged with the seat: their rows, and the money they add to the total. */
  rentals?: { rows: ReactNode; total: number } | null;
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
  roundOff = 0,
  rentals = null,
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
  // Read like a GST invoice: the discounts come off the value BEFORE tax, so
  // subtotal and discounts are excl. GST and the GST row is the tax charged.
  const bill = exclusiveOfGstBill(ticketTotal, discounts, breakup.subtotal, breakup.gstPct);
  // Venue charges are paid directly at the venue — shown for transparency but
  // NOT added to the online "Total payable".
  const venueCharges: VenueCharge[] = pod?.place_charges ?? [];

  return (
    <Card data-testid="order-summary" sx={{ flex: 1 }}>
      <CardContent sx={{ p: 2 }}>
        {media?.url && (
          <Box sx={{ height: 140, borderRadius: '18px', overflow: 'hidden', bgcolor: 'action.hover', mb: 1.5 }}>
            <Box component={mediaIsVideo ? 'video' : 'img'} src={mediaIsVideo ? videoSourceUrl(media.url) : media.url} alt="" autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
        )}
        <Typography data-testid="order-summary-title" noWrap sx={{ fontSize: 16, fontWeight: 600 }}>{title}</Typography>
        {whenWhere && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {whenWhere}
          </Typography>
        )}
        <Chip
          data-testid="order-summary-seats"
          size="small"
          icon={<GroupsIcon />}
          label={seatsText}
          sx={(theme) => ({ mt: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main', '& .MuiChip-icon': { color: 'primary.main' } })}
        />
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={0.75}>
          {seats > 1 && unitAmount > 0 ? (
            <Row
              label={t('mweb.checkout.ticketMultiplier', { vars: { price: fmt(unitAmount), seats } })}
              value={fmt(unitAmount * seats)}
            />
          ) : (
            <Row label={t('mweb.checkout.ticketPrice')} value={fmt(ticketTotal)} />
          )}
          <Row label={t('mweb.checkout.subtotalExclGst')} value={fmt(bill.subtotal)} />
          {bill.discounts.map((discount) => (
            <Row
              key={discount.key}
              testId={discount.testId}
              label={discount.label}
              value={`− ${fmt(discount.amount)}`}
              tone="success.main"
            />
          ))}
          {bill.discounts.length > 0 && (
            <Row label={t('mweb.checkout.taxableValue')} value={fmt(breakup.subtotal)} />
          )}
          <Row label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })} value={fmt(breakup.gst)} />
          {roundOff > 0 && (
            <Row testId="order-summary-round-off" label={t('mweb.checkout.roundOff')} value={`+ ${fmt(roundOff)}`} />
          )}
          {rentals?.rows}
          <Divider sx={{ my: 1 }} />
          <Row testId="order-summary-total" label={t('mweb.checkout.totalPayable')} value={fmt(round2(breakup.total + roundOff + (rentals?.total ?? 0)))} bold />
          <CoinSummaryRows coins={coins} />
          <VenueChargesBox charges={venueCharges} currency={breakup.currency} fmt={fmt} />
        </Stack>
      </CardContent>
    </Card>
  );
}
