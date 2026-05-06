import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { type ReactNode } from 'react';

interface Stat {
  label: string;
  value: string;
  delta?: string;
  icon: ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info' | 'error';
}

const STATS: Stat[] = [
  { label: 'Gross Volume (MTD)', value: '₹0', delta: '—', icon: <PaymentsIcon />, color: 'primary' },
  { label: 'Net Revenue (MTD)', value: '₹0', delta: '—', icon: <TrendingUpIcon />, color: 'success' },
  { label: 'Platform Fees Collected', value: '₹0', icon: <ReceiptLongIcon />, color: 'info' },
  { label: 'GST Collected', value: '₹0', icon: <RequestQuoteIcon />, color: 'warning' },
  { label: 'Pending Payouts', value: '₹0', icon: <AccountBalanceIcon />, color: 'primary' },
  { label: 'Refunds (MTD)', value: '₹0', icon: <TrendingDownIcon />, color: 'error' },
];

export default function FinanceDashboardPage() {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <AccountBalanceIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Finance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of payments, fees, taxes and payouts.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2}>
        {STATS.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.label}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: (t) => t.palette[s.color].main + '1a',
                      color: `${s.color}.main`,
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {s.value}
                    </Typography>
                    {s.delta && (
                      <Typography variant="caption" color="text.secondary">
                        {s.delta}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No transactions recorded yet. Live data will appear here once a payment provider is wired up.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
