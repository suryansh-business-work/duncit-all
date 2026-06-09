import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { format, formatDistanceToNow } from 'date-fns';
import type { HealthScore } from './queries';

interface Props {
  score: HealthScore;
}

const BAND_LABEL: Record<HealthScore['band'], string> = {
  RED: 'Needs attention',
  YELLOW: 'Doing OK',
  GREEN: 'In great shape',
};

const BAND_COLOR: Record<HealthScore['band'], 'error' | 'warning' | 'success'> = {
  RED: 'error',
  YELLOW: 'warning',
  GREEN: 'success',
};

export default function HealthBreakdown({ score }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" rowGap={1}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 950, lineHeight: 1 }}>
              {score.total_score}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              / 100
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Chip
              size="small"
              color={BAND_COLOR[score.band]}
              label={BAND_LABEL[score.band]}
              sx={{ fontWeight: 800, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Base score: {score.base_score}
              {score.delta_sum !== 0 && (
                <>
                  {' '}· Admin adjustment: {score.delta_sum > 0 ? `+${score.delta_sum}` : score.delta_sum}
                </>
              )}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
          Admin remarks
        </Typography>
        {score.adjustments.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No admin adjustments yet. Your score is the default {score.base_score}.
          </Alert>
        ) : (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {score.adjustments.map((a) => {
              const sign = a.delta > 0 ? `+${a.delta}` : `${a.delta}`;
              const color: 'success' | 'error' = a.delta > 0 ? 'success' : 'error';
              return (
                <Paper key={a.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Chip size="small" color={color} label={sign} sx={{ fontWeight: 900 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2">{a.remark}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.created_by_name} ·{' '}
                        {format(new Date(a.created_at), 'dd MMM yyyy, hh:mm a')} ·{' '}
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
