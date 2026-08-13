import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { categoryLabel, waMoney } from '../helpers';
import type { WaDashboardCategory } from '../queries';

/**
 * Where the money went. The bar is each category's share of the biggest spender
 * rather than of a budget — there is no budget in this data, and a bar drawn
 * against a number the page does not have is a shape nobody can check.
 */
export default function SpendByCategory({
  rows,
  currency,
}: Readonly<{ rows: WaDashboardCategory[]; currency: string }>) {
  const highest = Math.max(...rows.map((row) => row.cost), 0);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Spend by category
          </Typography>
          <Typography variant="caption" color="text.secondary">
            messages · cost
          </Typography>
        </Stack>

        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing sent in this window.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {rows.map((row) => (
            <Box key={row.category || 'uncategorised'}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {categoryLabel(row.category)}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {`${row.messages.toLocaleString()} · ${waMoney(row.cost, currency)}`}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={highest > 0 ? (row.cost / highest) * 100 : 0}
                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
