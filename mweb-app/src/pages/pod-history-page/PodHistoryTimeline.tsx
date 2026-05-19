import { Box, Button, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import UndoIcon from '@mui/icons-material/Undo';
import { Link as RouterLink } from 'react-router-dom';
import { useDateFormat } from '../../utils/dateFormat';
import type { PodHistoryItem } from './queries';

interface TimelineEvent {
  title: string;
  date?: string | null;
  detail: string;
  done: boolean;
  icon: 'join' | 'backout' | 'refund' | 'wait';
}

const iconFor = (event: TimelineEvent) => {
  if (!event.done) return <RadioButtonUncheckedIcon color="disabled" />;
  if (event.icon === 'backout') return <UndoIcon color="warning" />;
  if (event.icon === 'refund') return <ReceiptLongIcon color="success" />;
  if (event.icon === 'wait') return <HourglassTopIcon color="info" />;
  return <CheckCircleIcon color="success" />;
};

function buildTimeline(item: PodHistoryItem): TimelineEvent[] {
  const backedOut = item.status === 'BACKED_OUT';
  const refundProcessed = item.refund_status === 'PROCESSED';
  const refundPending = item.refund_status === 'PENDING';
  const refundNotStarted = item.refund_status === 'NOT_ELIGIBLE' || item.refund_status === 'NONE';
  return [
    { title: 'Pod joined', date: item.joined_at, detail: 'Your spot was confirmed for this pod.', done: true, icon: 'join' },
    { title: 'Backout requested', date: item.backed_out_at, detail: backedOut ? 'You backed out from this pod.' : 'No backout request has been made.', done: backedOut, icon: 'backout' },
    { title: 'Refund criteria', detail: refundPending ? 'Waiting for refund criteria to be filled.' : backedOut ? 'Refund eligibility was checked.' : 'Available after a backout request.', done: backedOut, icon: 'wait' },
    { title: refundProcessed ? 'Refund initiated' : 'Refund not initiated', detail: refundProcessed ? 'Refund has been marked as processed.' : refundNotStarted && backedOut ? 'This backout is not eligible for refund yet.' : 'Refund will update when criteria are met.', done: refundProcessed, icon: 'refund' },
  ];
}

export default function PodHistoryTimeline({ item }: { item: PodHistoryItem }) {
  const { formatDateTime } = useDateFormat();
  const events = buildTimeline(item);
  return (
    <Stack spacing={2}>
      {events.map((event, index) => (
        <Stack key={`${event.title}-${index}`} direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {iconFor(event)}
            {index < events.length - 1 && <Box sx={{ width: 2, height: 42, bgcolor: event.done ? 'primary.light' : 'divider', my: 0.5 }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800}>{event.title}</Typography>
            {event.date && <Typography variant="caption" color="text.secondary">{formatDateTime(event.date)}</Typography>}
            <Typography variant="body2" color="text.secondary">{event.detail}</Typography>
          </Box>
        </Stack>
      ))}
      <Button component={RouterLink} to="/policies/backout-terms" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
        Backout Terms &amp; Conditions
      </Button>
    </Stack>
  );
}