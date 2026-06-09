import { Box, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import UndoIcon from '@mui/icons-material/Undo';
import { useDateFormat } from '../../utils/dateFormat';
import type { PodHistoryItem } from './queries';

interface TimelineEvent {
  title: string;
  date?: string | null;
  detail: string;
  state: 'done' | 'current' | 'pending';
  icon: 'join' | 'backout' | 'refund' | 'wait';
  tag?: string;
}

const iconFor = (event: TimelineEvent) => {
  if (event.state === 'pending') return <RadioButtonUncheckedIcon color="disabled" />;
  if (event.state === 'current') return <HourglassTopIcon color="info" />;
  if (event.icon === 'backout') return <UndoIcon color="warning" />;
  if (event.icon === 'refund') return <ReceiptLongIcon color="success" />;
  return <CheckCircleIcon color="success" />;
};

function buildTimeline(item: PodHistoryItem): TimelineEvent[] {
  const backedOut = item.status === 'BACKED_OUT';
  const refundProcessed = item.refund_status === 'PROCESSED';
  const refundPending = item.refund_status === 'PENDING';
  const events: TimelineEvent[] = [
    { title: 'Pod Joined', date: item.joined_at, detail: 'Your spot was confirmed for this pod.', state: 'done', icon: 'join', tag: 'Completed' },
  ];
  if (!backedOut) {
    events.push({ title: 'Backout requested', detail: 'No backout request yet. Use Backout Pod from actions when needed.', state: 'current', icon: 'backout', tag: 'Available' });
    return events;
  }
  events.push({ title: 'Backout requested', date: item.backed_out_at, detail: 'Backout request was recorded.', state: 'done', icon: 'backout', tag: 'Completed' });
  events.push({ title: 'Refund criteria', detail: refundPending ? 'Waiting for refund criteria to be completed.' : 'Refund criteria was checked for this backout.', state: refundPending ? 'current' : 'done', icon: 'wait', tag: refundPending ? 'Waiting' : 'Checked' });
  events.push(refundProcessed
    ? { title: 'Refund initiated', detail: 'Refund has been initiated for this membership.', state: 'done', icon: 'refund', tag: 'Initiated' }
    : { title: 'Refund not initiated', detail: 'Refund has not been initiated for this backout yet.', state: 'current', icon: 'refund', tag: 'Not initiated' });
  return events;
}

export default function PodHistoryTimeline({ item }: Readonly<{ item: PodHistoryItem }>) {
  const { formatDateTime } = useDateFormat();
  const events = buildTimeline(item);
  return (
    <Stack spacing={1.75}>
      {events.map((event, index) => (
        <Stack key={`${event.title}-${index}`} direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {iconFor(event)}
            {index < events.length - 1 && <Box sx={{ width: 2, height: 38, bgcolor: event.state === 'pending' ? 'divider' : 'primary.light', my: 0.5 }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" fontWeight={900}>{event.title}</Typography>
              {event.tag && <Chip size="small" label={event.tag} color={event.state === 'done' ? 'success' : 'info'} variant={event.state === 'done' ? 'filled' : 'outlined'} sx={{ height: 20, fontSize: 11 }} />}
            </Stack>
            {event.date && <Typography variant="caption" color="text.secondary">{formatDateTime(event.date)}</Typography>}
            <Typography variant="body2" color="text.secondary">{event.detail}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}