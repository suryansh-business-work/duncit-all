import { Alert, Card, CircularProgress, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { buildEarningsStatement, formatStatementMoney } from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { POTENTIAL_POD_EARNINGS, SUGGESTED_TICKET_PRICES } from './queries';
import ChargesAccordion from './ChargesAccordion';
import PayoutCard from './PayoutCard';
import { VENUE_SHORTFALL_MESSAGE } from './pricingCopy';
import type { EarningsPreview } from './useEarningsPreview';

export { POTENTIAL_POD_EARNINGS, SUGGESTED_TICKET_PRICES };
export { useEarningsPreview, type EarningsPreview } from './useEarningsPreview';
export { default as TicketPriceField } from './TicketPriceField';

interface Props {
  preview: EarningsPreview;
}

/**
 * The host's final calculation for a pod. The server owns every number: it
 * bills PAYABLE spots (total − 1, because the host's own seat is free) and
 * deducts the venue's fixed slot price once for the pod — not once per booking —
 * matching how the pod is actually settled. Charges are grouped in a
 * collapsible tree; the payout card is the strongest element.
 */
export default function PricePanel({ preview }: Readonly<Props>) {
  const { currency } = usePricing();
  const { podAmount, noOfSpots, projection, loading, stale, hasVenue, venueShortfall } = preview;
  const w = projection?.waterfall;

  // ONE currency format everywhere on the card: ₹X,XXX.XX (en-IN grouping).
  const fmt = (value: number) => formatStatementMoney(value, currency);

  const breakdown = () => {
    if (podAmount <= 0 || noOfSpots <= 0) {
      return (
        <Typography variant="caption" color="text.secondary">
          Set a ticket price and the number of spots to preview your earnings.
        </Typography>
      );
    }
    // A 1-spot pod is the host's own free seat — there is nothing to bill.
    if (noOfSpots === 1) {
      return (
        <Typography variant="caption" color="text.secondary" data-testid="price-panel-host-only">
          This pod only has your own spot, which is free. Add more spots to earn.
        </Typography>
      );
    }
    // During the debounce window the previous waterfall would render beside
    // labels built from the live inputs — treat it as loading instead.
    if (!w || !projection || stale) {
      return loading || stale ? <CircularProgress size={18} /> : null;
    }
    // Every number below is a server waterfall value — the statement builder
    // only groups them and spells out the formulas.
    const statement = buildEarningsStatement(w, { has_venue: hasVenue, symbol: currency });
    return (
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="body2" fontWeight={800}>
              Total collection ({fmt(podAmount)} × {projection.payable_spots})
            </Typography>
            <Typography variant="body2" fontWeight={900} color="success.main">
              {fmt(w.amount)}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" data-testid="price-panel-included-gst">
            {statement.collection.included_gst_note}
          </Typography>
        </Stack>
        <ChargesAccordion
          statement={statement}
          money={fmt}
          venueError={venueShortfall ? VENUE_SHORTFALL_MESSAGE : null}
        />
        <PayoutCard
          amount={fmt(w.host_receives)}
          payingPax={projection.payable_spots}
          earnPct={w.host_earn_pct}
          collection={fmt(statement.net_payout.collection)}
          totalDeductions={fmt(statement.net_payout.total_deductions)}
        />
      </Stack>
    );
  };

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="create-pod-price-panel">
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center">
          <InsightsIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={900}>
            Potential earnings
          </Typography>
        </Stack>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          Your take-home for the full pod
        </Typography>
        {noOfSpots > 0 && (
          <Alert
            severity="success"
            icon={<InfoOutlinedIcon fontSize="small" />}
            sx={{ borderRadius: 2.5, py: 0.25 }}
            data-testid="price-panel-host-free-note"
          >
            Your spot is free — that is why the total calculation is based on the remaining
            available slots.
          </Alert>
        )}
        {breakdown()}
      </Stack>
    </Card>
  );
}
