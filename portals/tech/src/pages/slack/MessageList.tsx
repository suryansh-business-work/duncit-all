import { useEffect, useRef } from 'react';
import { Avatar, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { messageDate, messageDayKey, type SlackMessage } from './queries';
import { formatDate, formatTime } from '@duncit/app-settings';

interface Props {
  messages: SlackMessage[];
  /** Changes when the reader switches channel — jumps to the newest message. */
  channelId: string;
}

function MessageRow({
  message,
  botLabel,
  repliesLabel,
}: Readonly<{ message: SlackMessage; botLabel: string; repliesLabel: string }>) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ px: 2, py: 0.75 }}>
      <Avatar src={message.avatar || undefined} sx={{ width: 36, height: 36 }}>
        {message.user_name.slice(0, 1).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "baseline",
            flexWrap: "wrap"
          }}>
          <Typography variant="body2" sx={{
            fontWeight: 800
          }}>
            {message.user_name}
          </Typography>
          {message.is_bot && <Chip size="small" variant="outlined" label={botLabel} />}
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {formatTime(messageDate(message.ts))}
          </Typography>
        </Stack>
        {/* Slack mrkdwn is not markdown, and half-rendering it is worse than
            not rendering it — the raw text is at least exactly what was sent. */}
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.text}
        </Typography>
        {message.reply_count > 0 && (
          <Typography variant="caption" sx={{
            color: "primary.main"
          }}>
            {repliesLabel}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

/**
 * The conversation itself, oldest at the top — the order the server already
 * returns, so this only groups by day and pins the view to the newest message.
 */
export default function MessageList({ messages, channelId }: Readonly<Props>) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Jump to the newest message on open and whenever one arrives, which is what
  // makes a poll feel like a live conversation rather than a refreshing list.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [channelId, messages.length]);

  let lastDay = '';
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, py: 1 }}>
      {messages.map((m) => {
        const day = messageDayKey(m.ts);
        const isNewDay = day !== lastDay;
        lastDay = day;
        return (
          <Box key={m.ts}>
            {isNewDay && (
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {formatDate(messageDate(m.ts))}
                </Typography>
              </Divider>
            )}
            <MessageRow
              message={m}
              botLabel={t('tech.slack.bot')}
              repliesLabel={t('tech.slack.replies', { vars: { count: String(m.reply_count) } })}
            />
          </Box>
        );
      })}
      <div ref={bottomRef} />
    </Box>
  );
}
