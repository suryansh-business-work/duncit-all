import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';

interface Props {
  events: any[];
}

export default function OrderTrackingTimeline({ events }: Readonly<Props>) {
  const { formatDateTime } = useDateFormat();

  if (!events || events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tracking updates yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {events.map((event: any, index: number) => (
        <Stack key={`${event.status}-${event.at}-${index}`} direction="row" spacing={1.5}>
          <Box
            sx={{
              mt: 0.5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: index === 0 ? 'primary.main' : 'action.disabled',
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>
              {event.status}
            </Typography>
            {event.note && (
              <Typography variant="caption" color="text.secondary" display="block">
                {event.note}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {[event.location, formatDateTime(event.at)].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
