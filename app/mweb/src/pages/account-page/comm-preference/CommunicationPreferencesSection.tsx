import { Alert, Skeleton, Snackbar, Stack, Typography } from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import { buildCommPreferenceLabels, type CommChannel, type CommChannelState } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import ChannelPreferenceCard from './ChannelPreferenceCard';
import { useCommPreference } from './useCommPreference';

/** Channel → its icon and the screen that owns its categories. */
const CHANNEL_UI: Record<CommChannel, { icon: JSX.Element; to: string }> = {
  EMAIL: { icon: <MarkEmailReadOutlinedIcon color="action" />, to: '/account/mail-preference' },
  WHATSAPP: { icon: <WhatsAppIcon color="action" />, to: '/account/whatsapp-preference' },
  SMS: { icon: <SmsOutlinedIcon color="action" />, to: '/account/sms-preference' },
};

/**
 * Profile Settings → Communication Preferences.
 *
 * Three channels under one heading, each a door to its own categories plus the
 * one-time-code switch inline. The switch is here rather than behind the door
 * because it is the same question on all three — "where do my codes go?" — and
 * it is only answerable by seeing all three at once: the server refuses to let
 * the last reachable one be switched off, and that refusal makes no sense on a
 * screen that shows one channel.
 */
export default function CommunicationPreferencesSection() {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();

  const heading = (
    <Stack spacing={0.25}>
      <Typography variant="subtitle1" fontWeight={700}>
        {labels.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {labels.subtitle}
      </Typography>
    </Stack>
  );

  if (state.loading) {
    return (
      <Stack spacing={1.5}>
        {heading}
        {/* Three placeholders, matching what is about to arrive — a spinner
            here would collapse the page and push everything below it. */}
        {['email', 'whatsapp', 'sms'].map((channel) => (
          <Skeleton
            key={channel}
            variant="rounded"
            height={124}
            sx={{ borderRadius: '16px' }}
            data-testid={`comm-skeleton-${channel}`}
          />
        ))}
      </Stack>
    );
  }

  if (state.loadFailed || !state.preference) {
    return (
      <Stack spacing={1.5}>
        {heading}
        <Alert severity="error">{labels.loadFailed}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {heading}
      {state.saveFailed && <Alert severity="error">{labels.saveFailed}</Alert>}

      {state.preference.channels.map((row: CommChannelState) => (
        <ChannelPreferenceCard
          key={row.channel}
          icon={CHANNEL_UI[row.channel].icon}
          to={CHANNEL_UI[row.channel].to}
          labels={labels.channel(row.channel)}
          state={row}
          otpLabel={labels.otpLabel}
          otpLockedHint={labels.otpLocked}
          busy={state.busyChannel === row.channel}
          onToggleOtp={(enabled) => {
            state.setOtpChannel(row.channel, enabled).catch(() => {
              /* reported through state.saveFailed */
            });
          }}
        />
      ))}

      <Snackbar
        open={state.saved}
        autoHideDuration={2500}
        onClose={state.dismissSaved}
        message={labels.saved}
      />
    </Stack>
  );
}
