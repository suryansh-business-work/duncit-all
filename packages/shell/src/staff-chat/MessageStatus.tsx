import { Tooltip } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
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
  const { t } = useTranslation();
  if (message.failed) {
    return (
      <Tooltip title={t('shell.chat.status.retry')}>
        <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} aria-label={t('shell.chat.status.failed')} />
      </Tooltip>
    );
  }
  if (message.pending) {
    return (
      <Tooltip title={t('shell.chat.status.sending')}>
        <ScheduleIcon sx={{ fontSize: 14, opacity: 0.7 }} aria-label={t('shell.chat.status.sending')} />
      </Tooltip>
    );
  }
  if (message.read_at) {
    return (
      <Tooltip title={t('shell.chat.status.read')}>
        <DoneAllIcon sx={{ fontSize: 14, color: 'info.main' }} aria-label={t('shell.chat.status.read')} />
      </Tooltip>
    );
  }
  if (message.delivered_at) {
    return (
      <Tooltip title={t('shell.chat.status.delivered')}>
        <DoneAllIcon sx={{ fontSize: 14, opacity: 0.75 }} aria-label={t('shell.chat.status.delivered')} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title={t('shell.chat.status.sent')}>
      <CheckIcon sx={{ fontSize: 14, opacity: 0.75 }} aria-label={t('shell.chat.status.sent')} />
    </Tooltip>
  );
}
