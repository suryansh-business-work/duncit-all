import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { formatINR } from '@duncit/utils';
import { toFunnelRows } from './funnel-steps';
import type { ShortLinkFunnel } from '../queries';

interface Props {
  funnel: ShortLinkFunnel;
}

/**
 * Click to payment, step by step.
 *
 * Each bar is measured against the number who clicked, so the bars shorten
 * monotonically and the eye reads survival rather than seven unrelated
 * numbers. Counts are labelled directly — a funnel with a legend and no
 * numbers is a decoration.
 */
export default function FunnelCard({ funnel }: Readonly<Props>) {
  const rows = toFunnelRows(funnel.steps);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Click to checkout
            </Typography>
            <Typography variant="caption" color="text.secondary">
              How far the people who followed this link got
            </Typography>
          </Box>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" component="div">
                Conversion
              </Typography>
              <Typography variant="h6" fontWeight={800} component="div">
                {`${funnel.conversion_rate}%`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" component="div">
                Revenue
              </Typography>
              <Typography variant="h6" fontWeight={800} component="div">
                {formatINR(funnel.revenue)}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Box key={row.step} data-testid="funnel-step">
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2">{row.label}</Typography>
                <Stack direction="row" spacing={1.5} alignItems="baseline">
                  {row.droppedFromPrevious > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {`−${row.droppedFromPrevious.toLocaleString()}`}
                    </Typography>
                  )}
                  <Typography variant="body2" fontWeight={700}>
                    {row.count.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44, textAlign: 'right' }}>
                    {`${row.share}%`}
                  </Typography>
                </Stack>
              </Stack>
              <Box
                sx={{ mt: 0.5, height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}
              >
                <Box
                  data-testid="funnel-bar"
                  data-share={row.share}
                  sx={{
                    width: `${row.share}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    borderRadius: 4,
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
