import { Box, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { chatReplyText } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { ChatMessage } from './chat.types';

interface Props {
  replyTo: ChatMessage;
  /** The writer's own line reads "You", not their name. */
  mine: boolean;
  onCancel: () => void;
}

/** What the next message answers, over the composer, until it is sent or cancelled. */
export default function ChatReplyStrip({ replyTo, mine, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = mine ? t('mweb.chatRoom.reply.you') : replyTo.user_name || '';
  return (
    <Stack
      direction="row"
      spacing={1}
      data-testid="chat-reply-strip"
      sx={{ alignItems: 'center', px: { xs: 1.25, sm: 2 }, py: 0.75, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
    >
      <Box sx={{ width: 3, alignSelf: 'stretch', bgcolor: 'primary.main', borderRadius: 1 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
          {t('mweb.chatRoom.reply.replyingTo', { vars: { name } })}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
          {chatReplyText(replyTo, t)}
        </Typography>
      </Box>
      <DuncitIconButton
        size="small"
        data-testid="chat-reply-cancel"
        aria-label={t('mweb.chatRoom.reply.cancel')}
        onClick={onCancel}
      >
        <CloseIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
