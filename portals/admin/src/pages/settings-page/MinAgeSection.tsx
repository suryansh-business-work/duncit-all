import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const APP_SETTINGS_MIN_AGE = gql`
  query AppSettingsMinAge {
    appSettings {
      min_signup_age
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateAppSettingsMinAge($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      min_signup_age
      updated_at
    }
  }
`;

/** Matches the server clamp (server/src/utils/age.ts). */
const MIN_ALLOWED = 1;
const MAX_ALLOWED = 120;
const FALLBACK = 18;

interface Props {
  onToast: (msg: string) => void;
}

/** Minimum age to use the app — the single number every date-of-birth input
 * validates against (web signup, app signup and both profile editors), and the
 * one the server re-checks on register and profile update. It replaced a fixed
 * birth-year range, which drifted by a year every January and could only ever
 * approximate an age. */
export default function MinAgeSection({ onToast }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery(APP_SETTINGS_MIN_AGE, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE, { refetchQueries: [{ query: PUBLIC_APP_SETTINGS }] });

  const [age, setAge] = useState(String(FALLBACK));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.appSettings) setAge(String(data.appSettings.min_signup_age ?? FALLBACK));
  }, [data]);

  const value = Number(age);
  const invalid = !Number.isInteger(value) || value < MIN_ALLOWED || value > MAX_ALLOWED;
  const dirty = !!data?.appSettings && data.appSettings.min_signup_age !== value;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await save({ variables: { input: { min_signup_age: value } } });
      onToast('Minimum age saved');
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
            <Typography variant="subtitle1">{t('admin.settings.minAgeTitle')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              A date of birth younger than this is rejected on signup and when editing a profile,
              on the website and the app.
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

        <TextField
          label={t('admin.settings.minAge')}
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          sx={{ maxWidth: 260 }}
          fullWidth
          helperText={`Whole years, ${MIN_ALLOWED}–${MAX_ALLOWED} (default ${FALLBACK})`}
          slotProps={{
            htmlInput: { min: MIN_ALLOWED, max: MAX_ALLOWED, step: 1 }
          }}
        />
        {invalid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Enter a whole number between {MIN_ALLOWED} and {MAX_ALLOWED}.
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
