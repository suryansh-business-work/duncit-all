import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import LocalDateTimeField from '../../components/LocalDateTimeField';
import { TIME_ZONES, SOURCE_OPTIONS, toLocalInput, useClockPreview } from './time-source';
import { useTranslation } from '@duncit/shell';

const APP_SETTINGS_CLOCK = gql`
  query AppSettingsClock {
    appSettings {
      time_zone
      time_source
      custom_time
      custom_time_set_at
      updated_at
    }
  }
`;

const UPDATE_CLOCK = gql`
  mutation UpdateAppSettingsClock($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      time_zone
      time_source
      custom_time
      custom_time_set_at
      updated_at
    }
  }
`;

interface Props {
  onToast: (msg: string) => void;
}

/** Time zone + where every app reads "now" from. Drives all rendered dates and
 * the date-based occasion icons across mobile, mWeb and every portal. */
export default function TimeSourceSection({ onToast }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery(APP_SETTINGS_CLOCK, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE_CLOCK, { refetchQueries: [{ query: PUBLIC_APP_SETTINGS }] });

  const [zone, setZone] = useState('Asia/Kolkata');
  const [source, setSource] = useState('SERVER');
  const [customTime, setCustomTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const saved = data?.appSettings;
  useEffect(() => {
    if (!saved) return;
    setZone(saved.time_zone || 'Asia/Kolkata');
    setSource(saved.time_source || 'SERVER');
    setCustomTime(toLocalInput(saved.custom_time));
  }, [saved]);

  const preview = useClockPreview({ zone, source, customTime, saved });

  const dirty =
    !!saved &&
    (saved.time_zone !== zone ||
      saved.time_source !== source ||
      (source === 'CUSTOM' && toLocalInput(saved.custom_time) !== customTime));

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      // The anchor is only meaningful for CUSTOM; switching away clears it so a
      // stale anchor can never resurface when CUSTOM is picked again.
      const anchor = source === 'CUSTOM' && customTime ? new Date(customTime).toISOString() : null;
      await save({
        variables: { input: { time_zone: zone, time_source: source, custom_time: anchor } },
      });
      onToast('Time settings saved');
      await refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2
          }}>
          <Box>
            <Typography variant="subtitle1">{t('admin.settings.timeTitle')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Where every app reads &quot;now&quot; from, and the zone dates are shown in. Also
              decides which occasion icons are active.
            </Typography>
          </Box>
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={submit}
            disabled={busy || !dirty || loading}
          >
            {busy ? 'Saving…' : 'Save'}
          </DuncitButton>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label={t('admin.settings.timeZone')}
              value={TIME_ZONES.includes(zone) ? zone : '__custom__'}
              onChange={(e) => setZone(e.target.value === '__custom__' ? zone : e.target.value)}
              fullWidth
            >
              {TIME_ZONES.map((tz) => (
                <MenuItem key={tz} value={tz}>
                  {tz}
                </MenuItem>
              ))}
              <MenuItem value="__custom__">{t('admin.settings.otherZone')}</MenuItem>
            </TextField>
            <TextField
              label={t('admin.settings.ianaZone')}
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              fullWidth
              helperText={t('admin.settings.ianaHint')}
            />
          </Stack>

          <TextField
            select
            label={t('admin.settings.timeSource')}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            fullWidth
          >
            {SOURCE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {SOURCE_OPTIONS.find((o) => o.value === source)?.hint}
          </Typography>

          {source === 'CUSTOM' && (
            <LocalDateTimeField
              label={t('admin.settings.customTime')}
              value={customTime}
              onChange={setCustomTime}
              helperText={t('admin.settings.customTimeHint')}
            />
          )}

          <Alert severity={source === 'CUSTOM' ? 'warning' : 'info'}>
            Apps now show: <strong>{preview}</strong>
          </Alert>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </CardContent>
    </Card>
  );
}
