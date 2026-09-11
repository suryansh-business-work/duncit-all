import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { VENUE_EARNINGS_SUMMARY } from './queries';

/** Compact Venue Studio card linking to /venues/earnings with the headline
 * lifetime + pending numbers from myVenueEarningsSummary. */
export default function VenueEarningsLinkCard() {
  const { data } = useQuery<any>(VENUE_EARNINGS_SUMMARY, { fetchPolicy: 'cache-and-network' });
  const summary = data?.myVenueEarningsSummary;
  const symbol = summary?.currency_symbol ?? '₹';
  const money = (value: number) => `${symbol}${(Number(value) || 0).toFixed(2)}`;

  return (
    <Card>
      <CardActionArea component={RouterLink} to="/venues/earnings" data-testid="venue-earnings-link-card">
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 1.5, minHeight: 64 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'secondary.main',
            }}
          >
            <PaidRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>Earnings</Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>
              {summary
                ? `Lifetime ${money(summary.lifetime_earnings)} · Pending ${money(summary.pending_amount)}`
                : 'Payouts and slot-price breakdowns'}
            </Typography>
          </Box>
          <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
