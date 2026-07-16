import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { format } from 'date-fns';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';

const APP_SETTINGS_FORMATS = gql`
  query AppSettingsFormats {
    appSettings {
      date_format
      time_format
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateAppSettingsFormats($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      date_format
      time_format
      updated_at
    }
  }
`;

const DATE_PRESETS = [
  'dd MMM yyyy',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'EEE, dd MMM yyyy',
];
const TIME_PRESETS = ['hh:mm a', 'HH:mm', 'h:mm a', 'HH:mm:ss'];

interface Props {
  onToast: (msg: string) => void;
}

export default function DisplayFormatsSection({ onToast }: Readonly<Props>) {
  const { data, loading, refetch } = useQuery(APP_SETTINGS_FORMATS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE, { refetchQueries: [{ query: PUBLIC_APP_SETTINGS }] });

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
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1">Display formats</Typography>
            <Typography variant="body2" color="text.secondary">
              Global date &amp; time format used across the admin panel and member apps.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={submit}
            disabled={busy || !dirty || loading}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Date format"
              value={DATE_PRESETS.includes(dateFmt) ? dateFmt : '__custom__'}
              onChange={(e) =>
                setDateFmt(e.target.value === '__custom__' ? dateFmt : e.target.value)
              }
              fullWidth
            >
              {DATE_PRESETS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p} — {(() => { try { return format(new Date(), p); } catch { return ''; } })()}
                </MenuItem>
              ))}
              <MenuItem value="__custom__">Custom pattern…</MenuItem>
            </TextField>
            <TextField
              select
              label="Time format"
              value={TIME_PRESETS.includes(timeFmt) ? timeFmt : '__custom__'}
              onChange={(e) =>
                setTimeFmt(e.target.value === '__custom__' ? timeFmt : e.target.value)
              }
              fullWidth
            >
              {TIME_PRESETS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p} — {(() => { try { return format(new Date(), p); } catch { return ''; } })()}
                </MenuItem>
              ))}
              <MenuItem value="__custom__">Custom pattern…</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Date pattern (date-fns)"
              value={dateFmt}
              onChange={(e) => setDateFmt(e.target.value)}
              fullWidth
              helperText="e.g. dd MMM yyyy, dd/MM/yyyy, yyyy-MM-dd"
            />
            <TextField
              label="Time pattern (date-fns)"
              value={timeFmt}
              onChange={(e) => setTimeFmt(e.target.value)}
              fullWidth
              helperText="e.g. hh:mm a, HH:mm, HH:mm:ss"
            />
          </Stack>
          <Alert severity="info">Preview: <strong>{preview}</strong></Alert>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </CardContent>
    </Card>
  );
}
