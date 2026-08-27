import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import {
  REPORT_PROBLEM_SLACK,
  UPDATE_REPORT_PROBLEM_SLACK,
  type ReportProblemSlackSettings,
  type SlackChannelOption,
} from '../../../graphql/reported-problems';

/** Sentinel for "no channel picked" — an empty Select value renders the label
 * on top of the input, and this row is a real choice rather than a blank. */
const FALLBACK = '';

/**
 * The channels to offer.
 *
 * A channel that was picked and has since gone out of the bot's sight is kept
 * at the top of the list: dropping it would silently reset the Select to the
 * fallback and make Support believe nothing was ever configured.
 */
const channelOptions = (
  settings: ReportProblemSlackSettings | undefined
): SlackChannelOption[] => {
  const channels = settings?.channels ?? [];
  const chosen = settings?.channel_id ?? '';
  if (!chosen || channels.some((c) => c.id === chosen)) return channels;
  return [
    { id: chosen, name: settings?.channel_name || chosen, is_private: false, is_member: true },
    ...channels,
  ];
};

/**
 * Where a reported problem is announced.
 *
 * Slack is a NOTIFICATION, never the store of record — a report is filed in the
 * queue whether or not this is switched on, which is what the subtitle has to
 * keep saying so nobody reads the switch as "stop taking reports".
 */
export default function SlackRoutingCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{
    reportProblemSlackSettings: ReportProblemSlackSettings;
  }>(REPORT_PROBLEM_SLACK, { fetchPolicy: 'cache-and-network' });
  const [save, saveState] = useMutation(UPDATE_REPORT_PROBLEM_SLACK);

  const settings = data?.reportProblemSlackSettings;
  const [enabled, setEnabled] = useState(true);
  const [channelId, setChannelId] = useState(FALLBACK);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setChannelId(settings.channel_id);
  }, [settings]);

  const options = useMemo(() => channelOptions(settings), [settings]);
  const selected = options.find((c) => c.id === channelId);

  const submit = () => {
    save({
      variables: {
        input: { enabled, channel_id: channelId, channel_name: selected?.name ?? '' },
      },
    })
      .then(() => setSaved(true))
      .catch(() => undefined);
  };

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{
              fontWeight: 700
            }}>
              {t('support.problemSettings.slackTitle')}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('support.problemSettings.slackSubtitle')}
            </Typography>

            {error && <Alert severity="error">{error.message}</Alert>}
            {settings?.slack_configured === false && (
              <Alert severity="warning">{t('support.problemSettings.slackNotConfigured')}</Alert>
            )}
            {settings?.error && (
              <Alert severity="warning">
                {t('support.problemSettings.slackUnreachable')} {settings.error}
              </Alert>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
              }
              label={t('support.problemSettings.slackEnabled')}
            />

            <TextField
              select
              size="small"
              label={t('support.problemSettings.slackChannel')}
              value={channelId}
              disabled={!enabled}
              helperText={t('support.problemSettings.slackChannelHint')}
              onChange={(event) => setChannelId(event.target.value)}
              sx={{ maxWidth: 420 }}
            >
              <MenuItem value={FALLBACK}>{t('support.problemSettings.slackFallback')}</MenuItem>
              {options.map((channel) => (
                <MenuItem key={channel.id} value={channel.id}>
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    <span>{`#${channel.name}`}</span>
                    {channel.is_private && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t('support.problemSettings.slackPrivate')}
                      />
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            {selected?.is_member === false && (
              <Alert severity="warning">{t('support.problemSettings.slackNotMember')}</Alert>
            )}

            {saveState.error && <Alert severity="error">{saveState.error.message}</Alert>}

            <DuncitButton
              variant="contained"
              onClick={submit}
              disabled={loading || saveState.loading}
              sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
            >
              {saveState.loading ? t('shell.common.saving') : t('shell.common.save')}
            </DuncitButton>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSaved(false)}>
          {t('support.problemSettings.slackSaved')}
        </Alert>
      </Snackbar>
    </>
  );
}
