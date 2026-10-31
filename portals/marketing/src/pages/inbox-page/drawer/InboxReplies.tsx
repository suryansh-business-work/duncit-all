import { List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { SocialCommentReply } from '../queries';

/** Every reply sent from here, oldest first; one the network refused says why. */
export default function InboxReplies({ replies }: Readonly<{ replies: readonly SocialCommentReply[] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <Stack spacing={1} data-testid="inbox-replies">
      <Typography variant="subtitle2">{t('marketing.inbox.repliesTitle')}</Typography>
      {replies.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('marketing.inbox.noReplies')}
        </Typography>
      ) : (
        <List dense disablePadding>
          {replies.map((reply) => (
            <ListItem key={`${reply.at ?? ''}-${reply.text}`} disableGutters alignItems="flex-start">
              <ListItemText
                primary={reply.text}
                secondary={[
                  reply.by_name,
                  reply.at ? formatDateTime(reply.at) : '',
                  reply.ok ? '' : t('marketing.inbox.replyFailed', { vars: { error: reply.error } }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                slotProps={{ primary: { sx: { whiteSpace: 'pre-wrap' } }, secondary: { color: reply.ok ? 'text.secondary' : 'error' } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
