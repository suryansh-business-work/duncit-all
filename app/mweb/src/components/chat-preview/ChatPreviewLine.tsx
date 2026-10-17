import { Avatar, Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import type { PreviewLine } from './queries';

/** One read-only line of the chat card: who said it and the first two lines of it. */
export default function ChatPreviewLine({ message }: Readonly<{ message: PreviewLine }>) {
  const { t } = useTranslation();
  const text = message.type === 'IMAGE' ? t('mweb.chat.lastPhoto') : message.text;
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-end' }} data-testid={`chat-preview-line-${message.id}`}>
      <Avatar alt="" src={message.user_photo || undefined} sx={{ width: 32, height: 32 }}>
        {(message.user_name || '?').charAt(0)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
          {message.user_name}
        </Typography>
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 4, px: 1.5, py: 0.75 }}>
          <Typography
            variant="body2"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}
          >
            {text}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}
