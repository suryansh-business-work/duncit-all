import { Box } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ScheduleIcon from '@mui/icons-material/Schedule';

export type TickState = 'pending' | 'sent' | 'seen';

/** Computes the WhatsApp-style tick state for an AGENT's own outgoing message:
 * clock while it has no id yet, double-blue once the user has read past it,
 * single grey otherwise. */
export function tickState(messageId: string, createdAt: string, userLastReadAt: string | null): TickState {
  if (!messageId || messageId.startsWith('optimistic-')) return 'pending';
  if (userLastReadAt && new Date(userLastReadAt).getTime() >= new Date(createdAt).getTime()) {
    return 'seen';
  }
  return 'sent';
}

const ICON_SX = { fontSize: 14, ml: 0.25, verticalAlign: 'middle' } as const;

/** Renders the delivery/read tick for an agent's own bubble. */
export default function MessageTicks({ state }: Readonly<{ state: TickState }>) {
  if (state === 'pending') {
    return (
      <Box component="span" aria-label="Sending" title="Sending">
        <ScheduleIcon sx={{ ...ICON_SX, opacity: 0.7 }} />
      </Box>
    );
  }
  if (state === 'seen') {
    return (
      <Box component="span" aria-label="Seen" title="Seen">
        <DoneAllIcon sx={{ ...ICON_SX, color: '#34b7f1' }} />
      </Box>
    );
  }
  return (
    <Box component="span" aria-label="Delivered" title="Delivered">
      <DoneIcon sx={{ ...ICON_SX, opacity: 0.7 }} />
    </Box>
  );
}
