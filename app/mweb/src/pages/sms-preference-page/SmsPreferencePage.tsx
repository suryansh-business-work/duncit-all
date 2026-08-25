import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { findCommChannel } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { AuthMessagesCard, useCommPreference } from '../account-page/comm-preference';

/**
 * SMS Preference — Mail Preference's and WhatsApp Preference's twin, for the
 * one channel that has a single use.
 *
 * There is deliberately no category list here: an authentication message is
 * the only text Duncit sends today, so a list would be one row long and the
 * rest of the screen would be switches that control nothing. The screen says
 * that out loud instead — a preferences page with one switch reads as broken
 * unless it explains why there is one.
 */
export default function SmsPreferencePage() {
  const { t } = useTranslation();
  const state = useCommPreference();
  const sms = findCommChannel(state.preference?.channels, 'SMS');

  if (state.loading) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (state.loadFailed || !sms) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
        <Alert severity="error">{t('mweb.smsPreference.loadFailed')}</Alert>
      </Stack>
    );
  }

  // Hoisted out of the JSX so the branch sits at nesting zero and the layout
  // below stays a layout (S3776).
  const subtitle = sms.reachable
    ? t('mweb.smsPreference.subtitle', { vars: { destination: sms.destination } })
    : t('mweb.smsPreference.noNumber');

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{
          fontWeight: 800
        }}>
          {t('mweb.smsPreference.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {subtitle}
        </Typography>
      </Stack>

      <AuthMessagesCard channel="SMS" />

      <Alert severity="info" variant="outlined">
        {t('mweb.smsPreference.authOnly')}
      </Alert>
    </Stack>
  );
}
