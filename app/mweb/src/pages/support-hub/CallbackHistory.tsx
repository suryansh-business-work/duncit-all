import { useQuery } from '@apollo/client/react';
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { MY_CALLBACK_REQUESTS, type CallbackHistoryItem } from './queries';
import { formatDateTime } from '../../utils/dateFormat';

const STATUS_COLOR: Record<CallbackHistoryItem['status'], 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  CONTACTED: 'info',
  CLOSED: 'success',
};

function durationLabel(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CallbackHistory() {
  const { data, loading } = useQuery<{ myCallbackRequests: CallbackHistoryItem[] }>(
    MY_CALLBACK_REQUESTS,
    { fetchPolicy: 'cache-and-network' }
  );
  const items = data?.myCallbackRequests ?? [];

  if (loading && items.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (items.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 700
        }}>
        Previous callbacks
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 1 }}>
        {items.map((c) => {
          const dur = durationLabel(c.duration_seconds);
          return (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.25, borderRadius: '16px' }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {formatDateTime(c.created_at)}
                </Typography>
                <Chip size="small" color={STATUS_COLOR[c.status]} label={c.status} />
              </Stack>
              {c.reason && (
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {c.reason}
                </Typography>
              )}
              {(c.contacted_at || dur || c.conclusion) && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: 'block',
                    mt: 0.5
                  }}>
                  {c.contacted_at && `Called ${formatDateTime(c.contacted_at)}`}
                  {dur && ` · ${dur}`}
                  {c.conclusion && ` · ${c.conclusion}`}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}
