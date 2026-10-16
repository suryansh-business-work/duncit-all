import { Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { DuncitButton } from '@duncit/buttons';
import { canOpenPodChat, podChatPath, type PodChatAccessInput } from '@duncit/utils';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

interface PodChatEntryProps extends PodChatAccessInput {
  podId: string;
}

/**
 * The Pod Chat door on every pod's details. A host, an attendee or a JOINED
 * booking opens the room; anyone else sees it disabled with the reason beside
 * it. The app twin is components/details/PodChatEntry.
 */
export default function PodChatEntry({ podId, ...access }: Readonly<PodChatEntryProps>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canChat = canOpenPodChat(access);
  const hintId = `pod-chat-hint-${podId}`;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} data-testid="pod-chat-entry">
      <DuncitButton
        variant="outlined"
        size="small"
        startIcon={<ChatBubbleOutlineIcon />}
        disabled={!canChat}
        aria-describedby={hintId}
        data-testid="pod-chat-open"
        onClick={() => navigate(podChatPath(podId))}
        sx={{ flexShrink: 0 }}
      >
        {t('mweb.chat.podChat')}
      </DuncitButton>
      <Typography id={hintId} variant="body2" color="text.secondary" data-testid="pod-chat-hint">
        {canChat ? t('mweb.chat.podChatHint') : t('mweb.chat.podChatLocked')}
      </Typography>
    </Stack>
  );
}
