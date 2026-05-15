import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import IdentitySection from './IdentitySection';
import MascotSection from './MascotSection';
import AnimationsSection from './AnimationsSection';
import { BRANDING, UPDATE_BRANDING, emptyBrandingForm, type BrandingFormState } from './queries';

export default function BrandingPage() {
  const { data, loading, error } = useQuery(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation(UPDATE_BRANDING, { refetchQueries: ['Branding'] });

  const [form, setForm] = useState<BrandingFormState>(emptyBrandingForm);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.branding) {
      const b = data.branding;
      setForm({
        app_name: b.app_name ?? '',
        logo_url: b.logo_url ?? '',
        primary_color: b.primary_color ?? '#1976d2',
        support_email: b.support_email ?? '',
        mascot_name: b.mascot_name ?? 'Dunko',
        mascot_description_html: b.mascot_description_html ?? '',
        mascot_lottie_url: b.mascot_lottie_url ?? '',
        mascot_on_chair_lottie_url: b.mascot_on_chair_lottie_url ?? '',
        mascot_winner_lottie_url: b.mascot_winner_lottie_url ?? '',
        welcome_lottie_url: b.welcome_lottie_url ?? '',
        app_loader_lottie_url: b.app_loader_lottie_url ?? '',
        confetti_lottie_url: b.confetti_lottie_url ?? '',
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
            Logo, mascot and animations used across the apps.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent>
          <IdentitySection form={form} setForm={setForm} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <MascotSection form={form} setForm={setForm} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <AnimationsSection form={form} setForm={setForm} />
        </CardContent>
      </Card>

      {opError && <Alert severity="error">{opError}</Alert>}

      <Divider />
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" size="large" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save Branding'}
        </Button>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
