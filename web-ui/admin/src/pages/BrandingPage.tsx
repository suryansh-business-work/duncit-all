import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import MediaPickerField from '../components/MediaPickerField';

const BRANDING = gql`
  query Branding {
    branding {
      app_name
      logo_url
      primary_color
      support_email
      updated_at
    }
  }
`;
const UPDATE = gql`
  mutation UpdateBranding($input: UpdateBrandingInput!) {
    updateBranding(input: $input) {
      app_name
      logo_url
      primary_color
      support_email
      updated_at
    }
  }
`;

export default function BrandingPage() {
  const { data, loading, error } = useQuery(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation(UPDATE, { refetchQueries: ['Branding'] });

  const [form, setForm] = useState({
    app_name: '',
    logo_url: '',
    primary_color: '#1976d2',
    support_email: '',
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.branding) {
      setForm({
        app_name: data.branding.app_name ?? '',
        logo_url: data.branding.logo_url ?? '',
        primary_color: data.branding.primary_color ?? '#1976d2',
        support_email: data.branding.support_email ?? '',
      });
    }
  }, [data]);

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await updateMut({ variables: { input: form } });
      setToast('Branding saved');
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <BrandingWatermarkIcon color="primary" />
        <Box>
          <Typography variant="h5">Branding</Typography>
          <Typography variant="body2" color="text.secondary">
            Logo and app identity shown in the hub app header.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              <Avatar
                src={form.logo_url || undefined}
                variant="rounded"
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: form.primary_color,
                  fontSize: 36,
                  fontWeight: 700,
                }}
              >
                {form.app_name?.[0]?.toUpperCase() ?? 'D'}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Live preview
                </Typography>
                <Typography variant="h5">{form.app_name || 'App name'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {form.support_email || 'support@example.com'}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <TextField
              label="App name"
              value={form.app_name}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              fullWidth
            />
            <MediaPickerField
              label="Logo URL"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              folder="/branding"
              helperText="Square or wordmark image used in the app header."
              showPreview={false}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Primary color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                fullWidth
                placeholder="#1976d2"
              />
              <TextField
                label="Support email"
                value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                fullWidth
                type="email"
              />
            </Stack>

            {opError && <Alert severity="error">{opError}</Alert>}

            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" onClick={submit} disabled={busy}>
                {busy ? 'Saving…' : 'Save Branding'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
