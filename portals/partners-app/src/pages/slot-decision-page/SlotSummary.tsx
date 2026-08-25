import { Box, Link, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { slotSpanLabel } from '@duncit/slots';
import type { SlotDecisionRow } from './queries';

/** The booked window, venue/space and who is hosting — the "what am I deciding
 * on" block shared by the pending, approved and declined states. */
export default function SlotSummary({ request }: Readonly<{ request: SlotDecisionRow }>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();
  // Whole-day / multi-day aware — a bare start-day + times would misread both.
  const window = slotSpanLabel(request.start_at, request.end_at, request.whole_day, fmt, t('shell.slots.wholeDay'));
  const place = [request.venue_name, request.space_label].filter(Boolean).join(' · ');

  return (
    <Stack spacing={1.25}>
      <Typography variant="h6" sx={{
        fontWeight: 700
      }}>
        {request.pod_title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <EventIcon fontSize="small" color="action" />
        <Typography variant="body2" sx={{
          fontWeight: 700
        }}>
          {window}
        </Typography>
      </Stack>
      {place && (
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <PlaceIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {place}
          </Typography>
        </Stack>
      )}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <PersonIcon fontSize="small" color="action" />
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
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
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {request.pod_description}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
