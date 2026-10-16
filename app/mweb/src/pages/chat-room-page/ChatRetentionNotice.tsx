import { Stack, Typography } from '@mui/material';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { formatDateTime } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Pod rooms: when the whole room is deleted (ISO). */
  deletesAt: string | null;
  /** Club rooms: how many days a message is kept. */
  retentionDays: number | null;
}

/**
 * Tells the room's members how long what they write is kept — a pod room is
 * deleted some hours after the pod ends, a club room drops messages past an
 * age. Both numbers are admin settings the server answers with, so this only
 * words them. Renders nothing when there is nothing to promise.
 */
export default function ChatRetentionNotice({ deletesAt, retentionDays }: Readonly<Props>) {
  const { t } = useTranslation();
  let line: string | null = null;
  if (deletesAt) line = t('mweb.chatRoom.deletesOn', { vars: { date: formatDateTime(deletesAt) } });
  else if (retentionDays) line = t('mweb.chatRoom.deletesAfterDays', { vars: { days: retentionDays } });
  if (!line) return null;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      data-testid="chat-retention-notice"
      role="note"
      sx={{ alignItems: 'center', justifyContent: 'center', px: 2, pb: 1 }}
    >
      <ScheduleRoundedIcon fontSize="inherit" sx={{ color: 'text.secondary' }} aria-hidden />
      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {line}
      </Typography>
    </Stack>
  );
}
