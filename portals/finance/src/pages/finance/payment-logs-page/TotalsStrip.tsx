import { Card, CardContent, Stack, Typography } from '@mui/material';

/** One figure of a totals strip: a caption over its value, with an optional line of context. */
export interface StripTotal {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
}

/**
 * A row of filter-wide totals above a finance table — the same card the Payment
 * Logs KPIs use, for pages whose figures arrive with the table page itself
 * (Round Offs, each shop's Order Refunds).
 *
 * Every value is a SERVER aggregate over the whole filter. This component only
 * prints what it is given; it never adds anything up.
 */
export default function TotalsStrip({ totals, testId }: Readonly<{ totals: StripTotal[]; testId?: string }>) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} data-testid={testId}>
      {totals.map((total) => (
        <Card key={total.key} variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {total.label}
            </Typography>
            <Typography component="p" variant="h6" sx={{ fontWeight: 700 }}>
              {total.value}
            </Typography>
            {total.hint && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {total.hint}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
