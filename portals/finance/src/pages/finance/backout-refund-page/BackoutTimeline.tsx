import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import {
  BACKOUT_STATUS_COLORS,
  BACKOUT_STATUS_LABELS,
  fmtDate,
  type BackoutEvent,
} from './queries';

interface Props {
  events: BackoutEvent[];
}

/**
 * Horizontal MUI timeline of the Backout lifecycle — one node per recorded
 * event (immutable, chronological) showing status, backout count and time.
 * Wide timelines scroll inside the card (never the page).
 */
export default function BackoutTimeline({ events }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Backout Timeline
        </Typography>
        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No lifecycle events recorded for this request.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto', pb: 1 }}>
            <Stack direction="row" alignItems="flex-start" sx={{ minWidth: 'max-content' }}>
              {events.map((event, index) => (
                <Stack
                  key={`${event.status}-${event.at}`}
                  direction="row"
                  alignItems="flex-start"
                  data-testid={`backout-event-${index}`}
                >
                  <Stack spacing={0.75} alignItems="center" sx={{ minWidth: 190, px: 1 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        border: 3,
                        borderColor: 'primary.light',
                      }}
                    />
                    <StatusChip
                      status={event.status}
                      label={BACKOUT_STATUS_LABELS[event.status]}
                      colorMap={BACKOUT_STATUS_COLORS}
                    />
                    <Typography variant="caption" fontWeight={700}>
                      Backout Count: {event.backout_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDate(event.at)}
                    </Typography>
                  </Stack>
                  {index < events.length - 1 && (
                    <Box sx={{ width: 56, height: 2, bgcolor: 'divider', mt: '6px' }} />
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
