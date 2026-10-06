import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { WebsiteReelSettings } from '@duncit/gql-types';
import {
  REEL_SETTINGS_BOUNDS,
  reelSettingsSchema,
  toReelSettingsValues,
  type ReelSettingsFormOutput,
  type ReelSettingsFormValues,
} from './reel-settings.types';

interface Props {
  settings: WebsiteReelSettings;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ReelSettingsFormOutput) => void;
}

/** The two limits every website's Reel Slider shares. */
export default function ReelSettingsForm({ settings, submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => reelSettingsSchema((key, options) => t(key, options)), [t]);
  const { control, handleSubmit } = useForm<ReelSettingsFormValues, unknown, ReelSettingsFormOutput>({
    defaultValues: toReelSettingsValues(settings),
    resolver: zodResolver(schema) as Resolver<ReelSettingsFormValues, unknown, ReelSettingsFormOutput>,
    mode: 'onTouched',
  });
  const { max_reel_mb: mb, max_reels: reels } = REEL_SETTINGS_BOUNDS;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField
          control={control}
          name="max_reel_mb"
          type="number"
          label={t('websiteApp.reels.settings.maxReelMb')}
          hint={t('websiteApp.reels.settings.maxReelMbHint', { vars: { min: mb.min, max: mb.max } })}
          slotProps={{ htmlInput: { min: mb.min, max: mb.max, step: 1 } }}
          required
        />
        <RhfTextField
          control={control}
          name="max_reels"
          type="number"
          label={t('websiteApp.reels.settings.maxReels')}
          hint={t('websiteApp.reels.settings.maxReelsHint', { vars: { min: reels.min, max: reels.max } })}
          slotProps={{ htmlInput: { min: reels.min, max: reels.max, step: 1 } }}
          required
        />
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
            {submitting ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}
