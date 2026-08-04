import { Box, Link, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { format } from 'date-fns';
import type { SlotDecisionRow } from './queries';

/** The booked window, venue/space and who is hosting — the "what am I deciding
 * on" block shared by the pending, approved and declined states. */
export default function SlotSummary({ request }: Readonly<{ request: SlotDecisionRow }>) {
  const start = new Date(request.start_at);
  const end = new Date(request.end_at);
  const window = `${format(start, 'EEE, d MMM yyyy · h:mm a')} – ${format(end, 'h:mm a')}`;
  const place = [request.venue_name, request.space_label].filter(Boolean).join(' · ');

  return (
    <Stack spacing={1.25}>
      <Typography variant="h6" fontWeight={700}>
        {request.pod_title}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <EventIcon fontSize="small" color="action" />
        <Typography variant="body2" fontWeight={700}>
          {window}
        </Typography>
      </Stack>
      {place && (
        <Stack direction="row" spacing={1} alignItems="center">
          <PlaceIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {place}
          </Typography>
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <PersonIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Hosted by {request.host_name || 'a host'}
        </Typography>
        {request.host_email && (
          <Link href={`mailto:${request.host_email}`} variant="body2">
            {request.host_email}
          </Link>
        )}
        {request.host_phone && (
          <Link href={`tel:${request.host_phone}`} variant="body2">
            {request.host_phone}
          </Link>
        )}
      </Stack>
      {request.pod_description && (
        <Box sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {request.pod_description}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
