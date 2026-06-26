import { Chip, Divider, Stack, Typography } from '@mui/material';
import type { SupportChatMessage } from '../../../graphql/supportChat';
import { useDateFormat } from '../../../lib/useDateFormat';
import { groupByDay } from './groupByDay';
import MessageBubble from './MessageBubble';

interface Props {
  messages: SupportChatMessage[];
  userLastReadAt: string | null;
}

/** The scrollable message stack — agent right, user left, SYSTEM centered, with
 * Today / Yesterday / date separators and timezone-aware per-message times. */
export default function ChatMessages({ messages, userLastReadAt }: Readonly<Props>) {
  const { formatTime, dayKey, dayLabel } = useDateFormat();
  const groups = groupByDay(messages, dayKey, dayLabel);

  return (
    <Stack spacing={1.25}>
      {groups.map((group) => (
        <Stack key={group.key} spacing={1.25}>
          <Divider>
            <Typography variant="caption" color="text.secondary">
              {group.label}
            </Typography>
          </Divider>
          {group.messages.map((m) =>
            m.sender_role === 'SYSTEM' ? (
              <Stack key={m.id} direction="row" sx={{ justifyContent: 'center' }}>
                <Chip size="small" label={m.text} color="info" variant="outlined" />
              </Stack>
            ) : (
              <MessageBubble
                key={m.id}
                message={m}
                time={formatTime(m.created_at)}
                userLastReadAt={userLastReadAt}
              />
            ),
          )}
        </Stack>
      ))}
    </Stack>
  );
}
