import { CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';

/** First load of the room, before any message has arrived. */
export default function ChatRoomLoading() {
  const { t } = useTranslation();
  return (
    <Stack
      data-testid="chat-room-loading"
      sx={{
        alignItems: "center",
        p: 6
      }}>
      <CircularProgress aria-label={t('mweb.a11y.loading')} />
    </Stack>
  );
}
