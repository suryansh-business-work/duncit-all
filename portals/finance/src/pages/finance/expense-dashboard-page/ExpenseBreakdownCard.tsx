import { Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import type { ExpenseSlice } from './queries';

interface Props {
  title: string;
  slices: ExpenseSlice[];
  currency: string;
  /** Stored key -> the name Finance configured for it. */
  labelOf: (key: string) => string;
}

/**
 * One breakdown, as bars rather than a chart.
 *
 * A bar carries the share AND the exact amount on the same line, which is what
 * a reconciliation actually needs; a pie of eleven categories carries neither
 * legibly. The widest bar is the biggest spend, so the answer to "where did it
 * go" is the top row every time.
 */
export default function ExpenseBreakdownCard({
  title,
  slices,
  currency,
  labelOf,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const top = slices[0]?.total ?? 0;
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });

  return (
    <Card variant="outlined" sx={{ flex: '1 1 320px', minWidth: 300 }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {title}
        </Typography>
        {slices.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            {t('finance.expenseDashboard.nothingToBreakDown')}
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {slices.map((slice) => (
              <Stack key={slice.key || 'unattributed'} spacing={0.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                    {slice.key
                      ? labelOf(slice.key)
                      : t('finance.expenseDashboard.unattributed')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {money(slice.total)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  // Relative to the BIGGEST slice, not to the total: with eleven
                  // categories every bar against the total is a sliver, and the
                  // card stops telling you which one is the problem.
                  value={top > 0 ? Math.round((slice.total / top) * 100) : 0}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
