import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { format } from 'date-fns';
import type { CalEvent } from './useCalendarEvents';

interface Props {
  event: CalEvent | null;
  onClose: () => void;
  onEdit: (e: CalEvent) => void;
  onToggleDone: (e: CalEvent) => void;
  onDelete: (e: CalEvent) => void;
}

const ENTITY_LABEL: Record<string, string> = { VENUE_LEAD: 'Venue lead', HOST_LEAD: 'Host lead', GENERAL: 'General' };

/** Side drawer showing a calendar event's details + a jump to its lead. */
export default function EventDrawer({ event, onClose, onEdit, onToggleDone, onDelete }: Readonly<Props>) {
  const navigate = useNavigate();
  const isReminder = event?.kind === 'reminder';
  const done = event?.status === 'DONE';

  const openLead = () => {
    if (!event?.leadId) return;
    navigate(event.entity === 'VENUE_LEAD' ? `/venue-leads/${event.leadId}/view` : `/host-leads/${event.leadId}/view`);
    onClose();
  };

  return (
    <Drawer anchor="right" open={!!event} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}>
      {event && (
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="center" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>
              {isReminder ? 'Reminder' : 'Follow-up'}
            </Typography>
            <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
          </Stack>

          <Stack spacing={1.5} sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
            <Typography variant="h6" fontWeight={700}>{event.title}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={format(event.date, 'dd MMM yyyy, p')} />
              <Chip size="small" variant="outlined" label={ENTITY_LABEL[event.entity] ?? event.entity} />
              {isReminder && <Chip size="small" color={done ? 'success' : 'default'} label={done ? 'Done' : 'Pending'} />}
            </Stack>

            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>FROM</Typography>
              <Typography variant="body2">
                {event.leadName ? event.leadName : event.entity === 'GENERAL' ? 'General reminder (not linked to a lead)' : '—'}
              </Typography>
            </Box>

            {event.notes && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>NOTES</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{event.notes}</Typography>
              </Box>
            )}
          </Stack>

          <Stack spacing={1} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {event.leadId && (
              <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={openLead}>
                Open {event.entity === 'VENUE_LEAD' ? 'venue' : 'host'} lead
              </Button>
            )}
            {isReminder && (
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={done ? <RadioButtonUncheckedIcon /> : <CheckCircleIcon />} onClick={() => onToggleDone(event)}>
                  {done ? 'Mark pending' : 'Mark done'}
                </Button>
                <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(event)}>Edit</Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(event)}>Delete</Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
