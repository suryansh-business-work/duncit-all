import { Tooltip } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { StaffMessage } from './queries';

interface Props {
  message: StaffMessage;
}

/**
 * The ticks, on your own messages only.
 *
 * Four states, and they only ever move forwards: a clock while it is in flight,
 * one tick when the server has it, two when it reached one of their tabs, two
 * in colour when they read it. A failed send says so and can be retried rather
 * than sitting on a clock forever, which is the state that makes people send
 * the same thing twice.
 */
export default function MessageStatus({ message }: Readonly<Props>) {
  if (message.failed) {
    return (
      <Tooltip title="Not sent — tap to retry">
        <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} aria-label="Failed to send" />
      </Tooltip>
    );
  }
  if (message.pending) {
    return (
      <Tooltip title="Sending">
        <ScheduleIcon sx={{ fontSize: 14, opacity: 0.7 }} aria-label="Sending" />
      </Tooltip>
    );
  }
  if (message.read_at) {
    return (
      <Tooltip title="Read">
        <DoneAllIcon sx={{ fontSize: 14, color: 'info.main' }} aria-label="Read" />
      </Tooltip>
    );
  }
  if (message.delivered_at) {
    return (
      <Tooltip title="Delivered">
        <DoneAllIcon sx={{ fontSize: 14, opacity: 0.75 }} aria-label="Delivered" />
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Sent">
      <CheckIcon sx={{ fontSize: 14, opacity: 0.75 }} aria-label="Sent" />
    </Tooltip>
  );
}
