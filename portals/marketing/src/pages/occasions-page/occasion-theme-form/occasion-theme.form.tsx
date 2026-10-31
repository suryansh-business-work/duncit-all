import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, Paper, Stack } from '@mui/material';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import AtmosphereSection from './AtmosphereSection';
import BasicsSection from './BasicsSection';
import ColoursSection from './ColoursSection';
import EditorPreview from './EditorPreview';
import FireworksSection from './FireworksSection';
import FlyersSection from './FlyersSection';
import GarlandSection from './GarlandSection';
import { keptPaletteValues, themeValues } from './occasion-theme.mapping';
import { occasionThemeSchema } from './occasion-theme.schema';
import type { OccasionThemeFormProps, OccasionThemeFormValues } from './occasion-theme.types';
import ParticlesSection from './ParticlesSection';

/**
 * Design a look: its basics, its colours, and everything drawn over the app —
 * particles, flyers, fireworks, washes and the garland — with the result
 * running on a phone beside the form (below it on a small screen).
 */
export default function OccasionThemeForm({ theme, onSubmit, onCancel, serverError }: Readonly<OccasionThemeFormProps>) {
  const { t } = useTranslation();
  const kept = useMemo(() => keptPaletteValues(theme), [theme]);
  const schema = useMemo(() => occasionThemeSchema(t, kept), [t, kept]);
  const { control, handleSubmit, formState } = useForm<OccasionThemeFormValues, unknown, OccasionThemeFormValues>({
    defaultValues: themeValues(theme),
    resolver: zodResolver(schema) as unknown as Resolver<OccasionThemeFormValues, unknown, OccasionThemeFormValues>,
    mode: 'onChange',
  });
  const busy = formState.isSubmitting;
  const save = (apply: boolean) => handleSubmit((values) => onSubmit(values, apply))();

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="occasion-theme-form">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Stack spacing={2.5}>
            <BasicsSection control={control} />
            <ColoursSection control={control} />
            <ParticlesSection control={control} />
            <FlyersSection control={control} />
            <FireworksSection control={control} />
            <AtmosphereSection control={control} />
            <GarlandSection control={control} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <EditorPreview control={control} />
        </Grid>
      </Grid>
      <Paper
        variant="outlined"
        sx={{ position: 'sticky', bottom: (th) => th.spacing(1), zIndex: 'appBar', mt: 3, p: 1.5 }}
        data-testid="occasion-theme-actions"
      >
        <Stack spacing={1.5}>
          {serverError && <Alert severity="error">{serverError}</Alert>}
          {formState.submitCount > 0 && !formState.isValid && <Alert severity="warning">{t('marketing.occasions.editor.fixErrors')}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <DuncitButton onClick={() => onCancel(formState.isDirty)} disabled={busy}>
              {t('shell.common.cancel')}
            </DuncitButton>
            <DuncitButton variant="outlined" startIcon={<SaveRoundedIcon />} onClick={() => save(false)} disabled={busy} data-testid="occasion-theme-save">
              {t('shell.common.save')}
            </DuncitButton>
            <DuncitButton
              variant="contained"
              startIcon={<PublishRoundedIcon />}
              onClick={() => save(true)}
              disabled={busy}
              data-testid="occasion-theme-save-apply"
            >
              {t('marketing.occasions.editor.saveAndApply')}
            </DuncitButton>
          </Stack>
        </Stack>
      </Paper>
    </form>
  );
}
