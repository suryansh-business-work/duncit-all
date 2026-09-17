import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useTranslation } from '@duncit/shell';
import ConversationHeader from './ConversationHeader';
import JoinChannelNotice from './JoinChannelNotice';
import MessageList from './MessageList';
import SlackComposer from './SlackComposer';
import {
  slackErrorCode,
  SLACK_CHANNEL_HISTORY,
  type SlackChannel,
  type SlackMessage,
} from './queries';

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
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        height: '100%',
        p: 4
      }}>
      <ForumOutlinedIcon sx={{ fontSize: 48 }} color="disabled" />
      <Typography sx={{
        color: "text.secondary"
      }}>{hint}</Typography>
    </Stack>
  );
}

interface Props {
  channel: SlackChannel | null;
  /** Re-reads the channel list, so a joined channel stops saying "Not joined". */
  onChannelsChanged: () => void;
}

/** The right pane: who is talking, what they said, and a box to reply in. */
export default function ConversationPane({ channel, onChannelsChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(SLACK_CHANNEL_HISTORY, {
    variables: { channel: channel?.id ?? '', limit: HISTORY_LIMIT },
    skip: !channel,
    pollInterval: POLL_MS,
    fetchPolicy: 'cache-and-network',
  });

  if (!channel) return <EmptyPane hint={t('tech.slack.pickChannel')} />;

  const messages: SlackMessage[] = data?.slackChannelHistory ?? [];
  const isFirstLoad = loading && !data;

  // The bot cannot read a channel it was never invited to, whatever scopes the
  // token holds. Slack says so two ways — is_member on the channel list, and
  // not_in_channel when history is refused — and either one means the same
  // fix, so both lead to the same notice rather than a bare red error.
  const notInChannel = !channel.is_member || slackErrorCode(error) === 'not_in_channel';
  const rejoined = () => {
    onChannelsChanged();
    refetch().catch(() => undefined);
  };

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <ConversationHeader channel={channel} />
      {notInChannel && <JoinChannelNotice channel={channel} onJoined={rejoined} />}
      {error && !notInChannel && (
        <Alert severity="error" square>
          {error.message}
        </Alert>
      )}
      {isFirstLoad && (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
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
