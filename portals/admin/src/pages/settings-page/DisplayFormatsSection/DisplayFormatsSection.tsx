import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { format } from 'date-fns';
import {
  PUBLIC_APP_SETTINGS,
  keyboardPattern,
  patternPlaceholder,
  unsupportedPickerTokens,
  usesTwelveHourClock,
} from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { APP_SETTINGS_FORMATS, UPDATE } from './constants';
import FormatFields from './FormatFields';

interface Props {
  onToast: (msg: string) => void;
}

export default function DisplayFormatsSection({ onToast }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(APP_SETTINGS_FORMATS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation<any>(UPDATE, { refetchQueries: [{ query: PUBLIC_APP_SETTINGS }] });

  const [dateFmt, setDateFmt] = useState('dd MMM yyyy');
  const [timeFmt, setTimeFmt] = useState('hh:mm a');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.appSettings) {
      setDateFmt(data.appSettings.date_format || 'dd MMM yyyy');
      setTimeFmt(data.appSettings.time_format || 'hh:mm a');
    }
  }, [data]);

  const preview = useMemo(() => {
    const now = new Date();
    try {
      return `${format(now, dateFmt)} · ${format(now, timeFmt)}`;
    } catch {
      return 'Invalid format pattern';
    }
  }, [dateFmt, timeFmt]);

  // These two patterns are also what every date/time PICKER reads and writes,
  // and a picker field can only edit tokens it can split into sections — hand
  // it 'PPP' and it throws while rendering. The apps fall back rather than
  // crash, but silently: an admin who saved an unusable pattern would see the
  // default everywhere and have no idea why. So it is said here, at the point
  // of choosing, and saving is blocked.
  const badDateTokens = unsupportedPickerTokens(dateFmt);
  const badTimeTokens = unsupportedPickerTokens(timeFmt);
  const unusable = badDateTokens.length > 0 || badTimeTokens.length > 0;

  // What a date box asks for is the same pattern with the month in digits and
  // the weekday dropped — nobody types "Tue" or spells "September" into a
  // field. Shown here so the difference is chosen, not discovered at signup.
  const typedHint = t('admin.settings.typedPreview', {
    vars: { format: patternPlaceholder(keyboardPattern(dateFmt)) },
  });

  // A date-fns pattern does not say out loud whether pickers will count 1–12 or
  // 0–23, and that is what an operator is actually choosing here.
  const clockHint = usesTwelveHourClock(timeFmt)
    ? t('admin.settings.clockCycle12')
    : t('admin.settings.clockCycle24');

  const dirty =
    !!data?.appSettings &&
    (data.appSettings.date_format !== dateFmt ||
      data.appSettings.time_format !== timeFmt);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await save({ variables: { input: { date_format: dateFmt, time_format: timeFmt } } });
      onToast('Display formats saved');
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
            <Typography variant="subtitle1">{t('admin.settings.displayFormats')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              The one date &amp; time format every surface reads and writes — this panel, the
              portals, mWeb and the app, in what is displayed and in every date box that is
              typed into.
            </Typography>
          </Box>
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={submit}
            disabled={busy || !dirty || loading || unusable}
          >
            {busy ? 'Saving…' : 'Save'}
          </DuncitButton>
        </Stack>

        <Stack spacing={2}>
          <FormatFields dateFmt={dateFmt} timeFmt={timeFmt} setDateFmt={setDateFmt} setTimeFmt={setTimeFmt} />
          <Alert severity="info">Preview: <strong>{preview}</strong></Alert>
          <Alert severity="info">{typedHint}</Alert>
          <Alert severity="info">{clockHint}</Alert>
          {unusable && (
            <Alert severity="warning">
              The date and time pickers cannot edit{' '}
              <strong>{[...badDateTokens, ...badTimeTokens].join(', ')}</strong>. Every screen
              where a date is typed uses these same patterns, so pick tokens from the presets
              (d, dd, M, MM, MMM, MMMM, yyyy, EEE, HH, hh, mm, ss, a).
            </Alert>
          )}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </CardContent>
    </Card>
  );
}
