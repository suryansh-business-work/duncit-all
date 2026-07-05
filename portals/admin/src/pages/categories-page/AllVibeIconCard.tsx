import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Paper, Snackbar, Stack, Typography } from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import MediaPickerField from '../../components/MediaPickerField';
import { BRANDING, UPDATE_BRANDING } from '../branding-page/queries';

/**
 * "All" vibe-tab icon — the icon shown on the synthetic "All" tab that leads the
 * home "What's your vibe" tabber (mWeb + mobile). It has no Category document of
 * its own, so it is stored on the Branding singleton (`home_all_vibe_icon_url`)
 * and managed here alongside the real category icons. Empty falls back to the
 * bundled grid icon on each client.
 */
export default function AllVibeIconCard() {
  const { data } = useQuery(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation(UPDATE_BRANDING, { refetchQueries: ['Branding'] });

  const saved: string = data?.branding?.home_all_vibe_icon_url ?? '';
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    setValue(saved);
  }, [saved]);

  const dirty = value !== saved;

  const save = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await updateMut({ variables: { input: { home_all_vibe_icon_url: value } } });
      setToast('Saved');
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <AppsIcon color="primary" />
        <Stack>
          <Typography variant="subtitle1" fontWeight={700}>
            &quot;All&quot; tab icon
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Icon for the leading &quot;All&quot; tab in the home &quot;What&apos;s your vibe&quot;
            tabber. Applies to mWeb and the mobile app.
          </Typography>
        </Stack>
      </Stack>

      <MediaPickerField
        label="All tab icon"
        value={value}
        onChange={setValue}
        folder="/categories/all"
        accept="image/*"
        helperText="Square transparent PNG/SVG, ~96×96px — shown full-bleed, no background."
      />

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
