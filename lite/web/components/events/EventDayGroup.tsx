import { Box, Stack, Typography } from '@mui/material';
import type { LiteEventCard as LiteEventCardData } from '../../../shared/graphql/documents';
import { EventCard } from './EventCard';

interface EventDayGroupProps {
  label: string;
  events: readonly LiteEventCardData[];
  showStatus?: boolean;
  cardTo?: (event: LiteEventCardData) => string;
}

/** A day heading and the cards under it, three across on desktop and one on a phone. */
export function EventDayGroup({ label, events, showStatus, cardTo }: Readonly<EventDayGroupProps>) {
  return (
    <Stack component="section" spacing={1.5} data-testid="event-day-group">
      <Typography variant="h3" component="h2">
        {label}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} showStatus={showStatus} to={cardTo?.(event)} />
        ))}
      </Box>
    </Stack>
  );
}
