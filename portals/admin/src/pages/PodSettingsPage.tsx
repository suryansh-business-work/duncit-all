import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';

const POD_SETTINGS = gql`
  query PodSettings {
    appSettings {
      draft_retention_days
      updated_at
    }
  }
`;

const UPDATE_POD_SETTINGS = gql`
  mutation UpdatePodSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      draft_retention_days
      updated_at
    }
  }
`;

const DEFAULT_RETENTION_DAYS = 3;

/** Admin > Pods > Pod Settings — platform defaults for the Create-a-Pod flow.
 * Today it configures the draft-pod retention window enforced by the daily
 * cleanup job; the value also drives the Host Studio draft-expiry note. */
export default function PodSettingsPage() {
  const { data, loading, refetch } = useQuery(POD_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation(UPDATE_POD_SETTINGS, {
    refetchQueries: [{ query: PUBLIC_APP_SETTINGS }],
  });

  const [days, setDays] = useState(String(DEFAULT_RETENTION_DAYS));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (data?.appSettings) {
      setDays(String(data.appSettings.draft_retention_days ?? DEFAULT_RETENTION_DAYS));
    }
  }, [data]);

  const value = Number(days);
  const invalid = !Number.isInteger(value) || value < 1;
  const dirty = !!data?.appSettings && data.appSettings.draft_retention_days !== value;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await save({ variables: { input: { draft_retention_days: value } } });
      setToast('Pod settings saved');
      await refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Pod Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Platform-level defaults for the Create-a-Pod flow.
        </Typography>
      </Box>
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
              <Typography variant="subtitle1">Draft Pod Retention Period (Days)</Typography>
              <Typography variant="body2" color="text.secondary">
                Defines how many days a Pod can remain in Draft before permanent deletion. Changes
                apply only to unexpired Draft Pods.
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
            label="Draft Pod Retention Period (Days)"
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            fullWidth
            inputProps={{ min: 1 }}
            helperText="Minimum 1 day. Default 3."
          />
          {invalid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Enter a whole number of 1 or more.
            </Alert>
          )}
          {err && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {err}
            </Alert>
          )}
        </CardContent>
      </Card>
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
