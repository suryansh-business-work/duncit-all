import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface ChatHistoryTopProps {
  canLoadOlder: boolean;
  loadingOlder: boolean;
  olderFailed: boolean;
  /** Settles on either outcome — a failure shows as the alert below. */
  onShowOlder: () => Promise<void>;
}

/**
 * The top of a chat log while older lines may exist: a spinner while the page
 * before loads, and a focusable "Show earlier messages" for keyboard and
 * switch users (and to retry a failed page). Gone once the room's start is in.
 */
export default function ChatHistoryTop({ canLoadOlder, loadingOlder, olderFailed, onShowOlder }: Readonly<ChatHistoryTopProps>) {
  const { t } = useTranslation();
  if (!canLoadOlder && !loadingOlder) return null;
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'center', py: 0.5 }} data-testid="chat-history-top">
      <DuncitButton
        variant="text"
        size="small"
        loading={loadingOlder}
        onClick={onShowOlder}
        data-testid="chat-history-earlier"
      >
        {t('mweb.chat.showEarlier')}
      </DuncitButton>
      {olderFailed && (
        <Typography variant="caption" color="error" role="alert" sx={{ textAlign: 'center' }}>
          {t('mweb.chat.previewFailed')}
        </Typography>
      )}
    </Stack>
  );
}
