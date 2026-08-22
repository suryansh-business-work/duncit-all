import { Alert, Skeleton, Stack, Typography } from '@mui/material';
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
    <Stack spacing={0.5}>
      <Typography variant="h6" fontWeight={800}>
        {labels.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {labels.blurb}
      </Typography>
    </Stack>
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
            height={104}
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

      {COMM_CHANNELS.map((channel) => {
        const row = findCommChannel(channels, channel);
        if (!row) return null;
        const copy = labels.channel(channel);
        return (
          <ChannelLinkCard
            key={channel}
            channel={channel}
            icon={CHANNEL_UI[channel].icon}
            to={CHANNEL_UI[channel].to}
            name={copy.name}
            hint={copy.hint}
            summary={commChannelSummary(row, labels)}
          />
        );
      })}
    </Stack>
  );
}
