import { Box, Stack, Typography } from '@mui/material';

/** One step of a record's history. */
export interface TimelineEvent {
  key: string;
  title: string;
  note?: string;
  /** Who / where and when, already worded. */
  meta: string;
}

/** A record's history as a list, newest first — the newest step marked. */
export default function EventTimeline({ events, ariaLabel }: Readonly<{ events: readonly TimelineEvent[]; ariaLabel: string }>) {
  return (
    <Stack component="ol" spacing={1.5} aria-label={ariaLabel} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {events.map((event, index) => (
        <Stack component="li" key={event.key} direction="row" spacing={1.5}>
          <Box
            aria-hidden
            sx={{ mt: 0.75, width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: index === 0 ? 'primary.main' : 'action.disabled' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {event.title}
            </Typography>
            {event.note && (
              <Typography variant="caption" component="p" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                {event.note}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {event.meta}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
