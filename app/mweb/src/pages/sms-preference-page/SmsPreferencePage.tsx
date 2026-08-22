import { Alert, Card, CardContent, CircularProgress, Snackbar, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { buildCommPreferenceLabels, commRowState } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useCommPreference } from '../account-page/comm-preference';

/**
 * SMS Preference — Mail Preference's and WhatsApp Preference's twin, for the
 * one channel that has a single use.
 *
 * There is deliberately no category list here: a one-time code is the only text
 * Duncit sends today, so a list would be one row long and the rest of the
 * screen would be switches that control nothing. The screen says that out loud
 * instead — a preferences page with one switch reads as broken unless it
 * explains why there is one.
 */
export default function SmsPreferencePage() {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();
  const sms = state.preference?.channels.find((c) => c.channel === 'SMS') ?? null;

  if (state.loading) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
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

  const row = commRowState(sms);
  // Hoisted out of the JSX so the branch sits at nesting zero and the layout
  // below stays a layout (S3776).
  const subtitle = sms.reachable
    ? t('mweb.smsPreference.subtitle', { vars: { destination: sms.destination } })
    : t('mweb.smsPreference.noNumber');
  const caption = row.locked ? labels.otpLocked : t('mweb.smsPreference.otpBody');

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" fontWeight={800}>
          {t('mweb.smsPreference.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>

      {state.saveFailed && <Alert severity="error">{labels.saveFailed}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {t('mweb.smsPreference.otpHeading')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {caption}
              </Typography>
            </Stack>
            {state.busyChannel === 'SMS' ? (
              <CircularProgress size={20} sx={{ m: 1 }} />
            ) : (
              <Tooltip title={row.locked ? labels.otpLocked : ''}>
                <span>
                  <Switch
                    checked={sms.otp_enabled}
                    disabled={!row.canToggle}
                    onChange={(event) => {
                      state.setOtpChannel('SMS', event.target.checked).catch(() => {
                        /* reported through state.saveFailed */
                      });
                    }}
                    inputProps={{ 'aria-label': t('mweb.smsPreference.otpHeading') }}
                  />
                </span>
              </Tooltip>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="info" variant="outlined">
        {t('mweb.smsPreference.onlyUse')}
      </Alert>

      <Snackbar
        open={state.saved}
        autoHideDuration={2500}
        onClose={state.dismissSaved}
        message={labels.saved}
      />
    </Stack>
  );
}
