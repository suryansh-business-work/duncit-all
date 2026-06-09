import { Card, CardContent, Stack, Typography } from '@mui/material';
import { fmt } from './helpers';

interface Totals {
  count: number;
  gross: number;
  fee: number;
  gst: number;
}

export default function TotalsCards({ totals }: Readonly<{ totals: Totals }>) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Successful Payments
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {totals.count}
          </Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Gross
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {fmt(totals.gross)}
          </Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Platform Fees
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {fmt(totals.fee)}
          </Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            GST Collected
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {fmt(totals.gst)}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
