import { Alert, Card, Divider, Skeleton, Stack, Typography } from '@mui/material';
import {
  buildCommPreferenceLabels,
  commChannelSummary,
  findCommChannel,
} from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useCommPreference } from '../account-page/comm-preference';
import ChannelLinkCard from './ChannelLinkCard';
import { CHANNEL_UI, COMM_CHANNELS } from './channels';

/**
 * Communication Preferences — the hub, reached from the single row in Profile
 * Settings and the only place the three channels are listed together.
 *
 * It summarises and navigates; it never writes. That is the whole point of the
 * split: a switch that appears both here and on the channel's own screen is
 * two answers to one question, and the one somebody remembers is whichever
 * they saw last.
 */
export default function CommPreferencePage() {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();

  const heading = (
    <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600 }}>
      {labels.title}
    </Typography>
  );

  if (state.loading) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
        {heading}
        {/* Three placeholders, matching what is about to arrive — a spinner
            here would collapse the page and push everything below it. */}
        {COMM_CHANNELS.map((channel) => (
          <Skeleton
            key={channel}
            variant="rounded"
            height={72}
            sx={{ borderRadius: '16px' }}
            data-testid={`comm-skeleton-${channel}`}
          />
        ))}
      </Stack>
    );
  }

  if (state.loadFailed || !state.preference) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
        {heading}
        <Alert severity="error">{labels.loadFailed}</Alert>
      </Stack>
    );
  }

  const channels = state.preference.channels;

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
      {heading}

      <Card>
        <Stack divider={<Divider sx={{ ml: '68px' }} />}>
          {COMM_CHANNELS.map((channel) => {
            const row = findCommChannel(channels, channel);
            if (!row) return null;
            return (
              <ChannelLinkCard
                key={channel}
                channel={channel}
                icon={CHANNEL_UI[channel].icon}
                to={CHANNEL_UI[channel].to}
                name={labels.channel(channel).name}
                summary={commChannelSummary(row, labels)}
              />
            );
          })}
        </Stack>
      </Card>
    </Stack>
  );
}
