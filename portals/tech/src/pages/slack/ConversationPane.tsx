import { useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useTranslation } from '@duncit/shell';
import ConversationHeader from './ConversationHeader';
import MessageList from './MessageList';
import SlackComposer from './SlackComposer';
import { SLACK_CHANNEL_HISTORY, type SlackChannel, type SlackMessage } from './queries';

/** A screenful of context, not a channel's whole recent life on every poll. */
const HISTORY_LIMIT = 50;

/**
 * How often an open channel re-reads itself. Slack's own clients use a socket;
 * this is a portal page someone has open while they work, so a poll is honest
 * about the tradeoff and costs one request per reader per interval.
 */
const POLL_MS = 10_000;

/** Shown until a channel is picked — the pane is half the page, so it says why. */
function EmptyPane({ hint }: Readonly<{ hint: string }>) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', p: 4 }}>
      <ForumOutlinedIcon sx={{ fontSize: 48 }} color="disabled" />
      <Typography color="text.secondary">{hint}</Typography>
    </Stack>
  );
}

/** The right pane: who is talking, what they said, and a box to reply in. */
export default function ConversationPane({ channel }: Readonly<{ channel: SlackChannel | null }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(SLACK_CHANNEL_HISTORY, {
    variables: { channel: channel?.id ?? '', limit: HISTORY_LIMIT },
    skip: !channel,
    pollInterval: POLL_MS,
    fetchPolicy: 'cache-and-network',
  });

  if (!channel) return <EmptyPane hint={t('tech.slack.pickChannel')} />;

  const messages: SlackMessage[] = data?.slackChannelHistory ?? [];
  const isFirstLoad = loading && !data;

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <ConversationHeader channel={channel} />
      {/* The bot cannot read a channel it was never invited to, whatever scopes
          the token holds — so say the thing that fixes it. */}
      {!channel.is_member && (
        <Alert severity="warning" square>
          {t('tech.slack.inviteBot', { vars: { channel: channel.name } })}
        </Alert>
      )}
      {error && (
        <Alert severity="error" square>
          {error.message}
        </Alert>
      )}
      {isFirstLoad && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      )}
      {!isFirstLoad && !error && messages.length === 0 && (
        <Box sx={{ flex: 1 }}>
          <EmptyPane hint={t('tech.slack.noMessages')} />
        </Box>
      )}
      {messages.length > 0 && <MessageList messages={messages} channelId={channel.id} />}
      <SlackComposer
        channelId={channel.id}
        onSent={() => {
          refetch().catch(() => undefined);
        }}
      />
    </Stack>
  );
}
