import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ChannelList from './ChannelList';
import ConversationPane from './ConversationPane';
import SlackPermissionsButton from './SlackPermissionsButton';
import { SLACK_CHANNELS, SLACK_CONFIGURED, type SlackChannel } from './queries';

/** Tall enough to read a conversation in, without the page itself scrolling —
 * the two panes own their own overflow. */
const PANE_HEIGHT = 'calc(100vh - 210px)';

/**
 * Tech portal → Slack: the workspace as a chat client. Channels on the left,
 * the selected channel's messages and a composer on the right.
 *
 * This replaced a flat list of channel cards with a copy-ID button, which could
 * send but never show what came back — so verifying anything meant leaving for
 * the real Slack.
 */
export default function SlackSettingsPage() {
  const { t } = useTranslation();
  const configured = useQuery<any>(SLACK_CONFIGURED, { fetchPolicy: 'cache-and-network' });
  const isConfigured = configured.data?.slackConfigured === true;
  const { data, loading, error, refetch } = useQuery<any>(SLACK_CHANNELS, {
    skip: !isConfigured,
    fetchPolicy: 'cache-and-network',
  });
  const [selected, setSelected] = useState<SlackChannel | null>(null);
  const channels: SlackChannel[] = data?.slackChannels ?? [];

  // Open on a channel the bot can actually read, so the pane shows a
  // conversation rather than the "invite the bot" warning on first load.
  useEffect(() => {
    if (selected || channels.length === 0) return;
    setSelected(channels.find((c) => c.is_member) ?? channels[0] ?? null);
  }, [channels, selected]);

  if (configured.loading && !configured.data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!isConfigured) {
    return (
      <Stack spacing={2.5}>
        <Typography variant="h4" sx={{
          fontWeight: 950
        }}>
          {t('tech.slack.title')}
        </Typography>
        <Alert severity="warning">{t('tech.slack.notConfigured')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between"
        }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 950
          }}>
            {t('tech.slack.title')}
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>{t('tech.slack.subtitle')}</Typography>
        </Box>
        {/* Every failure below is a permissions question; this is the answer. */}
        <SlackPermissionsButton />
      </Stack>
      {/* The server names the exact Slack error and the missing bot scope, so
          the raw message is the actionable text — render it as-is. */}
      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && !data && (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && !error && channels.length === 0 && (
        <Alert severity="info">{t('tech.slack.noChannels')}</Alert>
      )}
      {channels.length > 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 0 }}>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 3, width: { xs: '100%', md: 300 }, flexShrink: 0, height: PANE_HEIGHT }}
          >
            <ChannelList
              channels={channels}
              selectedId={selected?.id ?? ''}
              onSelect={setSelected}
            />
          </Paper>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 3, flex: 1, minWidth: 0, height: PANE_HEIGHT, overflow: 'hidden' }}
          >
            <ConversationPane
              channel={selected}
              onChannelsChanged={() => {
                refetch().catch(() => undefined);
              }}
            />
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
