import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EMPTY_LAUNCH_MEDIA, parseApiError, type LaunchPageMedia } from '@duncit/utils';
import LaunchMediaFields from './LaunchMediaFields';
import { LAUNCH_PAGE_MEDIA, UPDATE_LAUNCH_PAGE_MEDIA } from './queries';
import { toLaunchMediaInput } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The set was saved — the page shows its toast. */
  onSaved: () => void;
}

interface LaunchMediaData {
  branding: { launch_media: LaunchPageMedia };
}

/**
 * The global launch page media: the video and backup image behind each of the
 * four screens of the waitlist page, for every city that is not launched
 * yet. Lives on the Branding singleton (beside the login backdrop) and is
 * edited here, next to the cities it plays behind; a city overrides any field
 * from its own Launch Settings.
 */
export default function LaunchMediaDialog({ open, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LaunchPageMedia>(EMPTY_LAUNCH_MEDIA);
  const [opError, setOpError] = useState<string | null>(null);
  // Fresh on every open: the set may have been changed from another tab.
  const { data, loading, error } = useQuery<LaunchMediaData>(LAUNCH_PAGE_MEDIA, {
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const [save, { loading: saving }] = useMutation(UPDATE_LAUNCH_PAGE_MEDIA, {
    // The operation names, not the titles: Branding is the branding page's own query.
    refetchQueries: ['LaunchPageMedia', 'Branding'],
  });

  useEffect(() => {
    if (data) setForm(toLaunchMediaInput(data.branding.launch_media));
  }, [data]);

  const onSubmit = async () => {
    setOpError(null);
    try {
      await save({ variables: { input: { launch_media: toLaunchMediaInput(form) } } });
      onSaved();
      onClose();
    } catch (e) {
      setOpError(parseApiError(e) || t('admin.locations.launchMediaSaveFailed'));
    }
  };

  let body;
  if (loading && !data) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{parseApiError(error)}</Alert>;
  } else {
    body = (
      <LaunchMediaFields value={form} onChange={setForm} folder="/locations/launch" testIdPrefix="launch-media" />
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" data-testid="launch-media-dialog">
      <DialogTitle>{t('admin.locations.launchMedia')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('admin.locations.launchMediaHint')}
          </Typography>
          {body}
          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={onSubmit}
          disabled={saving || loading || Boolean(error)}
          data-testid="launch-media-save"
        >
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
