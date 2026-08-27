import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { PUBLIC_URL_PATTERN, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { WaScenario } from './queries';

interface MediaFormValues {
  url: string;
  filename: string;
}

interface Props {
  /** The row being edited; null keeps the dialog closed. */
  scenario: WaScenario | null;
  saving: boolean;
  onClose: () => void;
  /** Writes ONLY the admin override — an empty url clears it. */
  onSave: (eventKey: string, url: string, filename: string) => void;
}

/**
 * The admin's own header asset for one scenario.
 *
 * It writes the OVERRIDE pair, never the campaign cache — the cache belongs to
 * reconcile, which overwrites it wholesale on every run, so an asset stored
 * there would silently vanish the next time somebody presses Reconcile.
 */
export default function MediaDialog({ scenario, saving, onClose, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      z.object({
        // AiSensy fetches the asset itself at send time, so nothing but an
        // absolute public link can ever work — the rule every media field shares.
        url: z.string().trim().regex(PUBLIC_URL_PATTERN, t('adminWhatsapp.mediaUrlHelp')),
        filename: z.string().trim(),
      }),
    [t]
  );
  const { control, handleSubmit, reset } = useForm<MediaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', filename: '' },
  });

  useEffect(() => {
    if (!scenario) return;
    // The override is what this edits; the campaign's own asset is only a
    // starting point when no override exists yet.
    reset({
      url: scenario.override_media_url || scenario.media_url,
      filename: scenario.override_media_filename,
    });
  }, [scenario, reset]);

  const clear = () => {
    if (scenario) onSave(scenario.event_key, '', '');
  };
  const submit = handleSubmit((values) => {
    if (scenario) onSave(scenario.event_key, values.url, values.filename);
  });

  return (
    <Dialog open={Boolean(scenario)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('adminWhatsapp.mediaDialogTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <DialogContentText variant="body2">
            {t('adminWhatsapp.mediaDialogIntro')}
          </DialogContentText>
          <RhfTextField
            control={control}
            name="url"
            label={t('adminWhatsapp.mediaUrlLabel')}
            hint={t('adminWhatsapp.mediaUrlHelp')}
          />
          <RhfTextField
            control={control}
            name="filename"
            label={t('adminWhatsapp.mediaFilenameLabel')}
            hint={t('adminWhatsapp.mediaFilenameHelp')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {Boolean(scenario?.override_media_url) && (
          <DuncitButton color="error" disabled={saving} onClick={clear} sx={{ mr: 'auto' }}>
            {t('adminWhatsapp.clearMedia')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose}>{t('marketingWhatsapp.cancel')}</DuncitButton>
        <DuncitButton variant="contained" disabled={saving} onClick={submit}>
          {saving ? t('marketingWhatsapp.submitting') : t('adminWhatsapp.setMedia')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
