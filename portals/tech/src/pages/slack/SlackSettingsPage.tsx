import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import { SLACK_CHANNELS, SLACK_CONFIGURED, type SlackChannel } from './queries';
import SlackComposer from './SlackComposer';

type CopyFn = (label: string, value: string) => void;

/** One channel row: name + badges + id/members/topic, with copy-ID and
 * copy-link actions. Hoisted so it isn't redefined each render (S6478). */
function ChannelRow({ channel, onCopy }: Readonly<{ channel: SlackChannel; onCopy: CopyFn }>) {
  const topicSuffix = channel.topic ? ` · ${channel.topic}` : '';
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={800} noWrap>
                #{channel.name}
              </Typography>
              {channel.is_private && <Chip size="small" label="private" />}
              {channel.is_member && <Chip size="small" color="success" label="joined" />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {channel.id} · {channel.num_members} members{topicSuffix}
            </Typography>
          </Box>
          <Tooltip title="Copy channel ID">
            <IconButton
              size="small"
              aria-label={`Copy ${channel.name} ID`}
              onClick={() => onCopy('channel ID', channel.id)}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy channel link">
            <span>
              <IconButton
                size="small"
                aria-label={`Copy ${channel.name} link`}
                disabled={!channel.link}
                onClick={() => onCopy('channel link', channel.link)}
              >
                <LinkIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Tech portal Slack Settings: the workspace's channels (copy ID/link) + a
 * test-send composer. Needs a bot token configured in Environment Variables. */
export default function SlackSettingsPage() {
  const configured = useQuery(SLACK_CONFIGURED, { fetchPolicy: 'cache-and-network' });
  const isConfigured = configured.data?.slackConfigured === true;
  const { data, loading, error } = useQuery(SLACK_CHANNELS, {
    skip: !isConfigured,
    fetchPolicy: 'cache-and-network',
  });
  const [copied, setCopied] = useState('');
  const channels: SlackChannel[] = data?.slackChannels ?? [];

  const copy: CopyFn = (label, value) => {
    globalThis.navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(label))
      .catch(() => undefined);
  };

  if (configured.loading && !configured.data) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={950}>
          Slack
        </Typography>
        <Typography color="text.secondary">
          Pick a channel, copy its ID + link, and send messages to it.
        </Typography>
      </Box>
      {isConfigured ? (
        <>
          {error && <Alert severity="error">{error.message}</Alert>}
          {copied && (
            <Alert severity="success" onClose={() => setCopied('')}>
              Copied {copied}
            </Alert>
          )}
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : null}
          {!loading && channels.length === 0 ? (
            <Alert severity="info">No channels the bot can see yet — invite it to a channel.</Alert>
          ) : null}
          <Stack spacing={1}>
            {channels.map((c) => (
              <ChannelRow key={c.id} channel={c} onCopy={copy} />
            ))}
          </Stack>
          <SlackComposer channels={channels} />
        </>
      ) : (
        <Alert severity="warning">
          Add a Slack bot token in Environment Variables → Slack to connect a workspace.
        </Alert>
      )}
    </Stack>
  );
}
