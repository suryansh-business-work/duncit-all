import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Paper, Stack, TextField, Typography, alpha } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DuncitButton } from '@duncit/buttons';
import type { SupportPodOption } from './queries';
import { MY_ACTIVE_SOS, RAISE_SOS } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

interface Props {
  selected: SupportPodOption | null;
}

interface GeoSample {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

async function captureLocation(): Promise<GeoSample | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        globalThis.clearTimeout(timeout);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      () => {
        globalThis.clearTimeout(timeout);
        resolve(null);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 4500 }
    );
  });
}

export default function SosContent({ selected }: Readonly<Props>) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data, refetch } = useQuery<any>(MY_ACTIVE_SOS, {
    variables: { pod_id: selected?.podDocId ?? '' },
    skip: !selected,
    fetchPolicy: 'cache-and-network',
  });
  const active = data?.myActiveBouncerSos ?? null;

  const [raise, { loading }] = useMutation<any>(RAISE_SOS);

  const handleRaise = async () => {
    if (!selected) return;
    setError(null);
    setSuccess(false);
    const location = await captureLocation();
    try {
      await raise({
        variables: {
          input: { pod_id: selected.podDocId, message: message.trim() || null, location },
        },
      });
      setMessage('');
      setSuccess(true);
      refetch();
    } catch (e: any) {
      setError(e?.message || 'Could not send SOS. Try again.');
    }
  };

  if (active) {
    return (
      <Paper sx={{ ...SURFACE_SX, p: 3 }}>
        <Stack
          spacing={1.5}
          sx={{
            alignItems: "center",
            textAlign: "center"
          }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
          <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
            SOS sent. Help is on the way.
          </Typography>
          <Chip
            size="small"
            color={active.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}
            label={active.status === 'ACKNOWLEDGED' ? 'Acknowledged by team' : 'Awaiting response'}
          />
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            We notified the host and admin team. Stay on this screen until someone reaches you.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          p: 2,
          borderRadius: '18px',
          bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "flex-start"
        }}>
          <WarningAmberIcon color="error" />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Only tap SOS in a real emergency
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Your live location, profile phone and pod context will be shared with the host & admin.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <TextField
        label={t('mweb.common.quickNoteOptional')}
        placeholder={t('mweb.supportHub.eGMedicalHelpNeeded')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        size="small"
        multiline
        minRows={2}
        fullWidth
        slotProps={{
          htmlInput: { maxLength: 500 }
        }}
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && !error && <Alert severity="success">{t('mweb.supportHub.sosSentHangTight')}</Alert>}

      <DuncitButton
        variant="contained"
        color="error"
        size="large"
        disabled={!selected || loading}
        onClick={handleRaise}
        sx={{ letterSpacing: 1 }}
      >
        {loading ? 'Sending SOS…' : 'SEND SOS'}
      </DuncitButton>
    </Stack>
  );
}
