import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { BRANDING, UPDATE_BRANDING } from '../branding-page/queries';
import { useTranslation } from '@duncit/shell';

/**
 * Heading + sub-heading over the home "What's your vibe" category filter
 * (mWeb + mobile). Stored on the Branding singleton next to the other home
 * vibe options; an empty field falls back to the copy bundled in each app.
 */
export default function VibeHeadingCard() {
  const { t } = useTranslation();
  const { data } = useQuery(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation(UPDATE_BRANDING, { refetchQueries: ['Branding'] });

  const savedHeading: string = data?.branding?.home_vibe_heading ?? '';
  const savedSubheading: string = data?.branding?.home_vibe_subheading ?? '';

  const [heading, setHeading] = useState('');
  const [subheading, setSubheading] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    setHeading(savedHeading);
    setSubheading(savedSubheading);
  }, [savedHeading, savedSubheading]);

  const dirty = heading !== savedHeading || subheading !== savedSubheading;

  const save = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await updateMut({
        variables: {
          input: { home_vibe_heading: heading, home_vibe_subheading: subheading },
        },
      });
      setToast(t('shell.common.saved'));
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <AutoAwesomeIcon color="primary" />
        <Stack>
          <Typography variant="subtitle1" fontWeight={700}>
            Vibe section heading
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Heading and sub-heading shown over the category filter on Home. Applies to mWeb
            and the mobile app; leave a field empty to keep the app&apos;s default copy.
          </Typography>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        <TextField
          label="Heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="What's your vibe today?"
          fullWidth
        />
        <TextField
          label="Sub-heading"
          value={subheading}
          onChange={(e) => setSubheading(e.target.value)}
          placeholder="Explore experiences that match your mood."
          fullWidth
        />
      </Stack>

      {opError && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {opError}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Button variant="contained" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Paper>
  );
}
