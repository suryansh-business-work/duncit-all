import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { VENUE_EARNINGS_SUMMARY } from './queries';

/** Compact Venue Studio card linking to /venues/earnings with the headline
 * lifetime + pending numbers from myVenueEarningsSummary. */
export default function VenueEarningsLinkCard() {
  const { data } = useQuery(VENUE_EARNINGS_SUMMARY, { fetchPolicy: 'cache-and-network' });
  const summary = data?.myVenueEarningsSummary;
  const symbol = summary?.currency_symbol ?? '₹';
  const money = (value: number) => `${symbol}${(Number(value) || 0).toFixed(2)}`;

  return (
    <Card
      component={RouterLink}
      to="/venues/earnings"
      variant="outlined"
      sx={{ borderRadius: 4, display: 'block', textDecoration: 'none' }}
      data-testid="venue-earnings-link-card"
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <PaidIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 950, lineHeight: 1.2 }}>
              Earnings
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }} noWrap>
              {summary
                ? `Lifetime ${money(summary.lifetime_earnings)} · Pending ${money(summary.pending_amount)}`
                : 'Payouts and slot-price breakdowns'}
            </Typography>
          </Box>
          <ChevronRightIcon color="action" />
        </Stack>
      </CardContent>
    </Card>
  );
}
