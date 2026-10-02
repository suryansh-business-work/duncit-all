import { Box, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import type { EventTicketRow } from '../queries';

const STATUS_COLOR: StatusColorMap = {
  VALID: 'warning',
  CHECKED_IN: 'success',
  CANCELLED: 'default',
};

export const fmt = (iso?: string | null) =>
  iso ? formatDateTime(iso) : '—';

const eventCaption = (t: EventTicketRow) =>
  t.pod_mode === 'VIRTUAL' ? 'Virtual' : t.venue_name || t.zone_name || 'Physical';

export const renderCode = (t: EventTicketRow) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 800
  }}>
    {t.ticket_code}
  </Typography>
);

export const renderEvent = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography
      variant="body2"
      component="span"
      sx={{
        fontWeight: 600,
        display: "block"
      }}>
      {t.pod_title}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>
      {eventCaption(t)}
    </Typography>
  </Box>
);

export const renderAttendee = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span" sx={{
      display: "block"
    }}>
      {t.user_name}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>
      {t.user_email}
    </Typography>
  </Box>
);

export const renderStatus = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <StatusChip status={t.status} label={t.status.replace('_', ' ')} colorMap={STATUS_COLOR} />
    {t.checked_in_at && (
      <Typography
        variant="caption"
        component="span"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {fmt(t.checked_in_at)}
      </Typography>
    )}
  </Box>
);
