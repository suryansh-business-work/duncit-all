import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import type { ShortLinkBreakdown } from '../queries';

interface Props {
  title: string;
  rows: ShortLinkBreakdown[];
  emptyText: string;
}

/** One breakdown — the top values of a dimension, each as a share of the
 * biggest, so the shape is readable without reading the numbers. */
export default function BreakdownCard({ title, rows, emptyText }: Readonly<Props>) {
  const top = rows[0]?.count ?? 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          {title}
        </Typography>

        {rows.length === 0 && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {emptyText}
          </Typography>
        )}

        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Box key={row.label}>
              <Stack direction="row" spacing={1} sx={{
                justifyContent: "space-between"
              }}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {row.label}
                </Typography>
                <Typography variant="body2" sx={{
                  fontWeight: 700
                }}>
                  {row.count.toLocaleString()}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                // top is only 0 when there are no rows, and then this never renders.
                value={Math.round((row.count / top) * 100)}
                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
