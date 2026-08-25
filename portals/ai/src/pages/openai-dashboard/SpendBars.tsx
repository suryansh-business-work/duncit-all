import { Box, Stack, Typography } from '@mui/material';
import { usd, tokens } from '../../lib/usd';

export interface SpendBarRow {
  /** Stable identity — a model name, a module, a date. Also the row's key. */
  id: string;
  label: string;
  cost_usd: number;
  calls: number;
  tokens: number;
}

/**
 * Horizontal bars scaled by COST, not by call count.
 *
 * A cheap task called ten thousand times and an expensive one called twice look
 * identical on a call-count bar, and the question these pages answer is where
 * the money goes — so the bar length is the money.
 */
export default function SpendBars({ rows, emptyText }: Readonly<{ rows: readonly SpendBarRow[]; emptyText: string }>) {
  const max = rows.reduce((m, r) => Math.max(m, r.cost_usd), 0) || 1;

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {rows.map((row) => (
        <Box key={row.id}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: "space-between",
              mb: 0.25
            }}>
            <Typography variant="caption" noWrap title={row.label} sx={{ maxWidth: '60%' }}>
              {row.label}
            </Typography>
            <Typography variant="caption" sx={{
              fontWeight: 700
            }}>
              {usd(row.cost_usd)}
            </Typography>
          </Stack>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${(row.cost_usd / max) * 100}%`,
                bgcolor: 'primary.main',
                borderRadius: 3,
              }}
            />
          </Box>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {row.calls.toLocaleString()} calls · {tokens(row.tokens)} tokens
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
