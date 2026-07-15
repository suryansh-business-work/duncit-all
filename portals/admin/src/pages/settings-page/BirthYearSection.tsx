import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { PUBLIC_APP_SETTINGS } from '../../utils/dateFormat';

const APP_SETTINGS_BIRTH_YEAR = gql`
  query AppSettingsBirthYear {
    appSettings {
      min_birth_year
      max_birth_year
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateAppSettingsBirthYear($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      min_birth_year
      max_birth_year
      updated_at
    }
  }
`;

interface Props {
  onToast: (msg: string) => void;
}

/** Configures the inclusive signup birth-year bounds enforced by the web + app
 * signup forms (min = oldest allowed, max = youngest — e.g. currentYear − 13). */
export default function BirthYearSection({ onToast }: Readonly<Props>) {
  const { data, loading, refetch } = useQuery(APP_SETTINGS_BIRTH_YEAR, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE, { refetchQueries: [{ query: PUBLIC_APP_SETTINGS }] });

  const [minYear, setMinYear] = useState('1940');
  const [maxYear, setMaxYear] = useState('2012');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.appSettings) {
      setMinYear(String(data.appSettings.min_birth_year ?? 1940));
      setMaxYear(String(data.appSettings.max_birth_year ?? 2012));
    }
  }, [data]);

  const min = Number(minYear);
  const max = Number(maxYear);
  const invalid = !Number.isInteger(min) || !Number.isInteger(max) || min < 1900 || max < min;
  const dirty =
    !!data?.appSettings &&
    (data.appSettings.min_birth_year !== min || data.appSettings.max_birth_year !== max);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await save({ variables: { input: { min_birth_year: min, max_birth_year: max } } });
      onToast('Birth-year limits saved');
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
            <Typography variant="subtitle1">Signup birth year</Typography>
            <Typography variant="body2" color="text.secondary">
              The earliest and latest birth year a new user may enter when signing up (web + app).
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={submit}
            disabled={busy || !dirty || loading || invalid}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Minimum birth year"
            type="number"
            value={minYear}
            onChange={(e) => setMinYear(e.target.value)}
            fullWidth
            helperText="Oldest allowed (e.g. 1940)"
          />
          <TextField
            label="Maximum birth year"
            type="number"
            value={maxYear}
            onChange={(e) => setMaxYear(e.target.value)}
            fullWidth
            helperText="Youngest allowed (e.g. 2012 for a 13+ gate)"
          />
        </Stack>
        {invalid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Enter valid years with maximum greater than or equal to minimum.
          </Alert>
        )}
        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
